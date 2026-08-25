from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required
from bson import ObjectId

org_chart_bp = Blueprint('org_chart', __name__)


def _s(emp):
    return {
        '_id':         str(emp['_id']),
        'name':        emp.get('name', ''),
        'designation': emp.get('designation', ''),
        'department':  emp.get('department', ''),
        'manager_id':  emp.get('manager_id') or None,
        'status':      emp.get('status', 'active'),
    }


@org_chart_bp.route('/', methods=['GET'])
@jwt_required()
def list_org_chart():
    """Flat list of active employees with their manager_id — the frontend
    assembles the reporting tree client-side. No salary/cost data here, so
    every role may view it."""
    db = current_app.db
    employees = list(db.employees.find({'status': {'$nin': ['exited', 'inactive']}}))
    return jsonify([_s(e) for e in employees])


@org_chart_bp.route('/<emp_id>/reports', methods=['GET'])
@jwt_required()
def direct_reports(emp_id):
    db = current_app.db
    reports = list(db.employees.find({'manager_id': emp_id, 'status': {'$nin': ['exited', 'inactive']}}))
    return jsonify([_s(e) for e in reports])
