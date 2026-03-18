import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CpuChipIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  PlayIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  FolderPlusIcon,
  InboxIcon,
  BoltIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error' | 'unknown';
  lastExecution?: string;
  executionCount?: number;
  webhookPath: string;
  triggers: string[];
  actions: string[];
  icon: string;
  category: string;
}

interface AutomationStatus {
  success: boolean;
  n8n: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime?: number;
    panelUrl?: string;
  };
  workflows: Workflow[];
  summary: {
    total: number;
    active: number;
    inactive: number;
    error: number;
    unknown: number;
  };
  lastChecked: string;
}

const getWorkflowIcon = (iconName: string) => {
  switch (iconName) {
    case 'mail': return EnvelopeIcon;
    case 'check-circle': return CheckCircleIcon;
    case 'folder-plus': return FolderPlusIcon;
    case 'inbox': return InboxIcon;
    default: return BoltIcon;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'inactive': return 'bg-gray-100 text-gray-800';
    case 'error': return 'bg-red-100 text-red-800';
    default: return 'bg-yellow-100 text-yellow-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
    case 'inactive': return <XCircleIcon className="h-4 w-4 text-gray-500" />;
    case 'error': return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
    default: return <QuestionMarkCircleIcon className="h-4 w-4 text-yellow-600" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active': return 'Aktiv';
    case 'inactive': return 'Inaktiv';
    case 'error': return 'Fel';
    default: return 'Okänd';
  }
};

const N8nAutomationsWidget: React.FC = () => {
  const queryClient = useQueryClient();
  const [testingWorkflow, setTestingWorkflow] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery<AutomationStatus>({
    queryKey: ['automations-status'],
    queryFn: api.getAutomationsStatus,
    refetchInterval: 60000, // Uppdatera varje minut
    staleTime: 30000,
  });

  const testMutation = useMutation({
    mutationFn: (workflowId: string) => api.testAutomation(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations-status'] });
    },
    onSettled: () => {
      setTestingWorkflow(null);
    }
  });

  const handleTest = (workflowId: string) => {
    setTestingWorkflow(workflowId);
    testMutation.mutate(workflowId);
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CpuChipIcon className="h-5 w-5 mr-2 text-purple-600" />
            Automatiseringar
          </h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <ExclamationTriangleIcon className="h-10 w-10 mx-auto text-yellow-500 mb-2" />
          <p>Kunde inte hämta automatiseringsstatus</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-purple-600 hover:text-purple-700"
          >
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  const { n8n, workflows, summary } = data;

  return (
    <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center flex-wrap gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
            <CpuChipIcon className="h-5 w-5 mr-2 text-purple-600" />
            Automatiseringar
          </h3>
          {/* n8n Health Badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            n8n.status === 'healthy' ? 'bg-green-100 text-green-800' :
            n8n.status === 'unhealthy' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
              n8n.status === 'healthy' ? 'bg-green-500' :
              n8n.status === 'unhealthy' ? 'bg-red-500' :
              'bg-yellow-500'
            }`}></span>
            {n8n.status === 'healthy' ? 'Online' : n8n.status === 'unhealthy' ? 'Offline' : 'Okänd'}
            {n8n.responseTime && <span className="ml-1 opacity-75">({n8n.responseTime}ms)</span>}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 text-gray-400 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50"
          title="Uppdatera status"
        >
          <ArrowPathIcon className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3 mb-4 sm:mb-6">
        <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{summary.total}</div>
          <div className="text-[10px] sm:text-xs text-gray-500">Totalt</div>
        </div>
        <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
          <div className="text-lg sm:text-2xl font-bold text-green-600">{summary.active}</div>
          <div className="text-[10px] sm:text-xs text-green-600">Aktiva</div>
        </div>
        <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
          <div className="text-lg sm:text-2xl font-bold text-gray-500">{summary.inactive}</div>
          <div className="text-[10px] sm:text-xs text-gray-500">Inaktiva</div>
        </div>
        <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg">
          <div className="text-lg sm:text-2xl font-bold text-red-600">{summary.error + summary.unknown}</div>
          <div className="text-[10px] sm:text-xs text-red-600">Fel</div>
        </div>
      </div>

      {/* Workflows List - Scrollable, max 3 visible */}
      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
        {workflows.map((workflow) => {
          const IconComponent = getWorkflowIcon(workflow.icon);
          const isTesting = testingWorkflow === workflow.id;

          return (
            <div
              key={workflow.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    workflow.status === 'active' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <IconComponent className={`h-5 w-5 ${
                      workflow.status === 'active' ? 'text-purple-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900">{workflow.name}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
                        {getStatusIcon(workflow.status)}
                        <span className="ml-1">{getStatusText(workflow.status)}</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{workflow.description}</p>

                    {/* Triggers & Actions */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {workflow.triggers.map((trigger, idx) => (
                        <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                          {trigger}
                        </span>
                      ))}
                      <span className="text-gray-400 text-xs px-1">→</span>
                      {workflow.actions.slice(0, 2).map((action, idx) => (
                        <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-700">
                          {action}
                        </span>
                      ))}
                      {workflow.actions.length > 2 && (
                        <span className="text-xs text-gray-500">+{workflow.actions.length - 2}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Test Button */}
                <button
                  onClick={() => handleTest(workflow.id)}
                  disabled={isTesting || workflow.status === 'error'}
                  className={`p-2 rounded-lg transition-colors ${
                    isTesting
                      ? 'bg-purple-100 text-purple-600'
                      : workflow.status === 'error'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'hover:bg-purple-50 text-gray-400 hover:text-purple-600'
                  }`}
                  title="Testa workflow"
                >
                  {isTesting ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayIcon className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Last Execution */}
              {workflow.lastExecution && (
                <div className="mt-2 flex items-center text-xs text-gray-400">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  Senast körd: {new Date(workflow.lastExecution).toLocaleString('sv-SE')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <span>Senast uppdaterad: {new Date(data.lastChecked).toLocaleTimeString('sv-SE')}</span>
        {n8n.panelUrl && (
          <a
            href={n8n.panelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Öppna n8n →
          </a>
        )}
      </div>
    </div>
  );
};

export default N8nAutomationsWidget;
