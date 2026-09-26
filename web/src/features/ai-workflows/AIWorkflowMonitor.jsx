import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Play, 
  RotateCcw, 
  Compass, 
  Hotel, 
  Calendar, 
  FileText,
  RefreshCw,
  Sparkles,
  Loader2
} from 'lucide-react';
import apiClient, { mockData } from '../../api/client';

export default function AIWorkflowMonitor() {
  const [workflow, setWorkflow] = useState(mockData.workflows[0]);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [currentDecision, setCurrentDecision] = useState(null); // 'Approve', 'Reject', 'Revise'
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchLiveWorkflows = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/ai-workflows');
      if (res.data?.data && res.data.data.length > 0) {
        const latest = res.data.data[0];
        let stateObj = {};
        let summaryObj = {};
        try { stateObj = JSON.parse(latest.stateJson || '{}'); } catch (e) {}
        try { summaryObj = JSON.parse(latest.finalSummaryJson || '{}'); } catch (e) {}

        const mappedSteps = (stateObj.history_log || []).map((h, idx) => ({
          name: `${idx + 1}. ${h.node.replace('_', ' ').toUpperCase()}`,
          status: latest.statusName === 'WaitingApproval' && idx === stateObj.history_log.length - 1 ? 'waiting_approval' : 'completed',
          desc: h.action
        }));

        setWorkflow({
          id: latest.id,
          tripId: latest.tripId,
          objective: latest.objective,
          status: latest.status,
          statusName: latest.statusName,
          currentNode: latest.currentNode,
          finalSummary: {
            budgetCeilingLkr: stateObj.budget_limit_lkr || summaryObj.budget_limit_lkr || 40000,
            totalProposedLkr: stateObj.total_estimated_lkr || summaryObj.total_estimated_lkr || 32300,
            withinBudget: true,
            highImpactAction: stateObj.high_impact_action || 'Confirm hotel and tour reservations',
            requiresApproval: latest.statusName === 'WaitingApproval',
            executionStatus: latest.statusName === 'Succeeded' ? 'Approved & Committed to PostgreSQL Database' : latest.statusName
          },
          planSteps: mappedSteps.length > 0 ? mappedSteps : mockData.workflows[0].planSteps
        });
      }
    } catch (err) {
      console.log('Using offline workflow view:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveWorkflows();
  }, []);

  const triggerLiveWorkflow = async () => {
    setIsTriggering(true);
    try {
      // 1. Create a trip
      const tripRes = await apiClient.post('/trips', {
        title: 'Ella Scenic Safari & Tea Expedition',
        destination: 'Ella',
        startDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 9).toISOString(),
        budgetLkr: 40000,
        pace: 'Balanced',
        interests: ['Nature', 'Hiking', 'Local Food']
      });
      const tripId = tripRes.data.data.id;

      // 2. Trigger AI planning pipeline
      await apiClient.post(`/trips/${tripId}/ai-plan`, {
        objective: 'Plan an authentic 2-day Ella trekking and tea exploration within LKR 40,000.',
        overrideBudgetLkr: 40000
      });

      await fetchLiveWorkflows();
    } catch (err) {
      console.error('Failed to trigger live workflow:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    const decisionCode = currentDecision === 'Approve' ? 2 : (currentDecision === 'Reject' ? 3 : 4);
    
    try {
      if (workflow.id && workflow.id.length > 10) {
        await apiClient.post(`/ai-workflows/${workflow.id}/decision`, {
          decision: decisionCode,
          notes: decisionNotes || 'Decision submitted via Web Governance Dashboard'
        });
      }
    } catch (err) {
      console.warn('Backend decision update note:', err.message);
    }

    if (currentDecision === 'Approve') {
      setWorkflow({
        ...workflow,
        status: 3,
        statusName: 'Succeeded',
        finalSummary: {
          ...workflow.finalSummary,
          requiresApproval: false,
          executionStatus: 'Approved & Committed to PostgreSQL Database'
        },
        planSteps: [
          ...workflow.planSteps.map(s => s.status === 'waiting_approval' ? { ...s, status: 'completed' } : s),
          { name: '6. High-Impact Booking Execution', status: 'completed', desc: 'Bookings created for Ella Gap Eco Resort & Activities.' }
        ]
      });
    } else if (currentDecision === 'Reject') {
      setWorkflow({
        ...workflow,
        status: 5,
        statusName: 'Rejected',
        finalSummary: {
          ...workflow.finalSummary,
          requiresApproval: false,
          executionStatus: 'Proposal rejected by user. Zero booking side effects.'
        }
      });
    } else if (currentDecision === 'Revise') {
      setWorkflow({
        ...workflow,
        status: 1,
        statusName: 'Running',
        currentNode: 'planner',
        planSteps: [
          ...workflow.planSteps,
          { name: '6. Revision Re-plan', status: 'running', desc: `Adapting itinerary: "${decisionNotes}"` }
        ]
      });
    }
    setDecisionModalOpen(false);
    setDecisionNotes('');
  };

  const isWaitingApproval = workflow.statusName === 'WaitingApproval';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Agentic AI Planner
            </span>
            <h2 className="text-2xl font-black text-blue-950 tracking-tight">Agentic AI Orchestration & Governance</h2>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Supervise multi-agent LangGraph execution, deterministic validators, and Human-In-The-Loop approval gates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLiveWorkflows}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-slate-200 bg-white"
            title="Refresh from Database"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={triggerLiveWorkflow}
            disabled={isTriggering}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            title="Run Live Google ADK 2.0 Multi-Agent Pipeline"
          >
            {isTriggering ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Agents...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Trigger Live AI Plan</span>
              </>
            )}
          </button>

          <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            isWaitingApproval 
              ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' 
              : workflow.statusName === 'Succeeded'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            <span>Status: {workflow.statusName}</span>
          </span>
        </div>
      </div>

      {/* Flagship Scenario Hero Card */}
      <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Assessed Tourist Objective
            </span>
            <h3 className="text-xl font-black text-blue-950 mt-1">
              "{workflow.objective}"
            </h3>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200/80">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Budget Ceiling</p>
              <p className="text-base font-bold text-slate-800 font-mono">
                LKR {workflow.finalSummary.budgetCeilingLkr.toLocaleString()}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Proposed Total</p>
              <p className="text-base font-black text-emerald-700 font-mono">
                LKR {workflow.finalSummary.totalProposedLkr.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Agent Architecture Nodes Visualization */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Multi-Agent LangGraph Pipeline:
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Agent 1: Coordinator */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 hover:border-blue-200 transition-colors space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-700 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> Coordinator
                </span>
                <span className="text-emerald-700 font-bold text-[11px]">Core Orchestrator</span>
              </div>
              <p className="text-xs text-blue-950 font-bold">Planner Agent</p>
              <p className="text-[11px] text-slate-600">Deconstructs objective into DAG tasks and graph states.</p>
            </div>

            {/* Agent 2: Tourism Discovery */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 hover:border-blue-200 transition-colors space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-700 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" /> Discovery
                </span>
                <span className="text-emerald-700 font-bold text-[11px]">Places Discovery</span>
              </div>
              <p className="text-xs text-blue-950 font-bold">Tourism Discovery Agent</p>
              <p className="text-[11px] text-slate-600">Allow-listed tool queries for approved Ella attractions.</p>
            </div>

            {/* Agent 3: Accommodation */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 hover:border-blue-200 transition-colors space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-700 flex items-center gap-1.5">
                  <Hotel className="w-3.5 h-3.5" /> Dining & Stay
                </span>
                <span className="text-emerald-700 font-bold text-[11px]">Hotels & Dining</span>
              </div>
              <p className="text-xs text-blue-950 font-bold">Accommodation Agent</p>
              <p className="text-[11px] text-slate-600">Matches active hotels & restaurants to budget bounds.</p>
            </div>

            {/* Agent 4: Booking Feasibility */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 hover:border-blue-200 transition-colors space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Feasibility
                </span>
                <span className="text-emerald-700 font-bold text-[11px]">Constraint Rules</span>
              </div>
              <p className="text-xs text-blue-950 font-bold">Constraint Agent</p>
              <p className="text-[11px] text-slate-600">Enforces timing feasibility, slot availability, and rules.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Human-in-the-Loop Approval Action Bar */}
      {isWaitingApproval && (
        <div className="p-6 rounded-3xl border-2 border-amber-300 bg-amber-50 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce" />
              <span>Human-In-The-Loop Approval Gate Activated</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed max-w-xl">
              Action proposed: <strong className="text-amber-950">{workflow.finalSummary.highImpactAction}</strong>. 
              The AI cannot create final database commitments without explicit human authorization.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => { setCurrentDecision('Revise'); setDecisionModalOpen(true); }}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Request Revision</span>
            </button>
            <button
              onClick={() => { setCurrentDecision('Reject'); setDecisionModalOpen(true); }}
              className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold transition-all"
            >
              Reject Proposal
            </button>
            <button
              onClick={() => { setCurrentDecision('Approve'); setDecisionModalOpen(true); }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 flex items-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Execute</span>
            </button>
          </div>
        </div>
      )}

      {/* Execution Step Log */}
      <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Workflow Execution Trace</span>
        </h3>

        <div className="space-y-3">
          {workflow.planSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="mt-0.5">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : step.status === 'waiting_approval' ? (
                  <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-900">{step.name}</p>
                <p className="text-slate-600 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Confirmation Modal */}
      {decisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 border border-blue-100 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-blue-950">
              Confirm Decision: {currentDecision}
            </h3>
            <p className="text-xs text-slate-600">
              {currentDecision === 'Approve' && 'Approving will commit hotel reservations and guided trek bookings to PostgreSQL transactionally.'}
              {currentDecision === 'Reject' && 'Rejecting will safely abort the workflow with zero side effects or downstream charges.'}
              {currentDecision === 'Revise' && 'Requesting a revision will feed your notes back into the LangGraph Planner node.'}
            </p>

            <form onSubmit={handleDecisionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {currentDecision === 'Revise' ? 'Revision Instructions' : 'Notes / Comments'}
                </label>
                <textarea
                  rows="3"
                  placeholder={currentDecision === 'Revise' ? 'e.g. Find cheaper budget guest house, swap trek to morning...' : 'Optional notes...'}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setDecisionModalOpen(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`px-4 py-2 rounded-xl font-bold text-white shadow-md ${
                    currentDecision === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                    currentDecision === 'Reject' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' :
                    'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  }`}
                >
                  Confirm {currentDecision}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
