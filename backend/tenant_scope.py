"""
tenant_scope.py — auto-injects tenant_id into every Mongo query issued
through get_db(). This is the sanctioned way route code should touch
app.db from here on; direct current_app.db access is reserved for:
  - backend/routes/auth.py::login() (runs before a JWT/tenant is known)
  - backend/routes/platform.py (platform-admin routes are not tenant data)
  - background jobs that explicitly loop per-tenant
    (backend/scheduler.py, backend/services/essl_sync.py)

Usage in a route:
    from tenant_scope import get_db
    db = get_db()
    db.employees.find_one({'_id': ObjectId(eid)})   # tenant_id merged in automatically
"""
from flask import g, current_app

# Methods where the first positional/keyword arg is a query filter dict —
# tenant_id gets merged into it.
_FILTER_METHODS = (
    'find', 'find_one', 'find_one_and_update', 'find_one_and_delete',
    'find_one_and_replace', 'update_one', 'update_many',
    'delete_one', 'delete_many', 'count_documents', 'distinct',
)
# Methods that insert one or more documents — tenant_id gets set on each
# document if not already present (never overridden).
_INSERT_METHODS = ('insert_one', 'insert_many')


class TenantMismatchError(ValueError):
    """Raised when a query filter or insert document names a different
    tenant_id than the current session's — this is either a bug or an
    attempted cross-tenant access, never silently resolved."""


class TenantScopedCollection:
    def __init__(self, collection, tenant_id):
        self._coll = collection
        self._tid = tenant_id

    def __getattr__(self, name):
        real = getattr(self._coll, name)
        if name in _FILTER_METHODS:
            return self._wrap_filter(real, name)
        if name in _INSERT_METHODS:
            return self._wrap_insert(real, name)
        if name == 'aggregate':
            return self._wrap_aggregate(real)
        # Anything not explicitly handled (create_index, drop_index, list_indexes,
        # bulk_write, etc.) passes through unscoped — these are schema/admin
        # operations, not tenant-filtered data operations. bulk_write in
        # particular is not auto-scoped; if a route ever needs it, its
        # operations must set tenant_id explicitly.
        return real

    def _merge_filter(self, filt):
        filt = dict(filt or {})
        existing = filt.get('tenant_id')
        if existing is not None and existing != self._tid:
            raise TenantMismatchError(
                f"query filter named tenant_id={existing!r} but session tenant "
                f"is {self._tid!r} — refusing to silently override"
            )
        filt['tenant_id'] = self._tid
        return filt

    def _wrap_filter(self, fn, name):
        def wrapped(filt=None, *args, **kwargs):
            return fn(self._merge_filter(filt), *args, **kwargs)
        return wrapped

    def _tag_doc(self, doc):
        doc = dict(doc)
        existing = doc.get('tenant_id')
        if existing is not None and existing != self._tid:
            raise TenantMismatchError(
                f"insert document named tenant_id={existing!r} but session "
                f"tenant is {self._tid!r} — refusing to plant it under a "
                f"foreign tenant"
            )
        doc['tenant_id'] = self._tid
        return doc

    def _wrap_insert(self, fn, name):
        if name == 'insert_one':
            def wrapped(doc, *args, **kwargs):
                return fn(self._tag_doc(doc), *args, **kwargs)
        else:
            def wrapped(docs, *args, **kwargs):
                return fn([self._tag_doc(d) for d in docs], *args, **kwargs)
        return wrapped

    def _wrap_aggregate(self, fn):
        def wrapped(pipeline, *args, **kwargs):
            pipeline = [{'$match': {'tenant_id': self._tid}}] + list(pipeline)
            return fn(pipeline, *args, **kwargs)
        return wrapped


class TenantScopedDB:
    def __init__(self, real_db, tenant_id):
        if not tenant_id:
            raise ValueError("TenantScopedDB requires a non-empty tenant_id")
        self._db = real_db
        self._tid = tenant_id

    def __getattr__(self, name):
        return TenantScopedCollection(self._db[name], self._tid)

    def __getitem__(self, name):
        return self.__getattr__(name)


def get_db():
    """Call this instead of current_app.db inside any tenant-scoped route
    (i.e. any route decorated with @tenant_scoped / @require_role)."""
    tenant_id = getattr(g, 'tenant_id', None)
    if not tenant_id:
        raise RuntimeError(
            "get_db() called with no g.tenant_id set — this route is missing "
            "@tenant_scoped / @require_role, or ran before it"
        )
    return TenantScopedDB(current_app.db, tenant_id)


def scoped_db_for(tenant_id):
    """For code that runs outside a Flask request context (background jobs
    in scheduler.py / services/essl_sync.py) and already knows which tenant
    it's operating on — builds a TenantScopedDB directly without going
    through Flask's g."""
    from flask import current_app as _app
    return TenantScopedDB(_app.db, tenant_id)
