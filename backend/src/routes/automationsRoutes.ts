import { Router } from 'express';
import axios from 'axios';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// n8n URLs - intern för API-anrop, extern för användargränssnitt
const N8N_INTERNAL_URL = process.env.N8N_INTERNAL_URL || 'http://localhost:5678';
const N8N_EXTERNAL_URL = process.env.N8N_EXTERNAL_URL || process.env.N8N_PANEL_URL || 'http://localhost:5678';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';
const N8N_API_KEY = process.env.N8N_API_KEY;

// Hjälpfunktion för att bestämma ikon och kategori baserat på workflow-namn
function getWorkflowMetadata(name: string): { icon: string; category: string; triggers: string[]; actions: string[] } {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('offert') && lowerName.includes('skicka')) {
    return { icon: 'mail', category: 'Offerter', triggers: ['När offert skickas'], actions: ['Email till kund', 'PDF-bilaga'] };
  }
  if (lowerName.includes('kundrespons') || lowerName.includes('quote-response')) {
    return { icon: 'check-circle', category: 'Offerter', triggers: ['Kund accepterar/avvisar'], actions: ['Email till admin', 'Telegram-notis'] };
  }
  if (lowerName.includes('contact') || lowerName.includes('kontakt')) {
    return { icon: 'inbox', category: 'Leads', triggers: ['Nytt kontaktformulär'], actions: ['Skapa projekt', 'Email till kund'] };
  }
  if (lowerName.includes('error') || lowerName.includes('notification')) {
    return { icon: 'alert-triangle', category: 'System', triggers: ['Vid fel'], actions: ['Telegram-notis'] };
  }
  if (lowerName.includes('projekt') || lowerName.includes('project')) {
    return { icon: 'folder-plus', category: 'Projekt', triggers: ['Offert accepterad'], actions: ['Skapa projekt'] };
  }

  return { icon: 'zap', category: 'Automation', triggers: ['Webhook'], actions: ['Automatisk'] };
}

interface WorkflowStatus {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error' | 'unknown';
  lastExecution?: string;
  executionCount?: number;
  errorCount?: number;
  webhookPath?: string;
  triggers: string[];
  actions: string[];
  icon: string;
  category: string;
}

interface N8nHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  version?: string;
  responseTime?: number;
}

/**
 * GET /api/automations/status
 * Hämta status för alla automatiseringar - DIREKT från n8n API
 */
router.get('/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const startTime = Date.now();
    let n8nHealth: N8nHealth = { status: 'unknown' };
    let workflows: WorkflowStatus[] = [];

    // Kolla om n8n är tillgänglig
    try {
      const healthResponse = await axios.get(`${N8N_INTERNAL_URL}/healthz`, {
        timeout: 3000,
        headers: N8N_API_KEY ? { 'X-N8N-API-KEY': N8N_API_KEY } : {}
      });

      n8nHealth = {
        status: healthResponse.status === 200 ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime
      };

      // Hämta ALLA workflows direkt från n8n API
      if (N8N_API_KEY) {
        try {
          const workflowsResponse = await axios.get(`${N8N_INTERNAL_URL}/api/v1/workflows`, {
            timeout: 5000,
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
          });

          const n8nWorkflows = workflowsResponse.data?.data || [];

          // Mappa n8n workflows direkt - UTAN hårdkodade definitioner
          workflows = n8nWorkflows.map((w: any) => {
            const metadata = getWorkflowMetadata(w.name || '');

            // Hitta webhook path från workflow nodes
            const webhookNode = w.nodes?.find((n: any) => n.type?.includes('webhook'));
            const webhookPath = webhookNode?.parameters?.path ? `/webhook/${webhookNode.parameters.path}` : undefined;

            return {
              id: w.id,
              name: w.name,
              description: `Workflow: ${w.name}`,
              status: w.active ? 'active' : 'inactive',
              lastExecution: w.updatedAt,
              webhookPath,
              ...metadata
            } as WorkflowStatus;
          });
        } catch (apiError) {
          console.log('n8n API inte tillgänglig:', apiError);
          n8nHealth.status = 'unhealthy';
        }
      } else {
        console.log('N8N_API_KEY saknas - kan inte hämta workflows');
      }
    } catch (error) {
      console.log('n8n health check failed:', error);
      n8nHealth = { status: 'unhealthy', responseTime: Date.now() - startTime };
    }

    // Beräkna summary
    const summary = {
      total: workflows.length,
      active: workflows.filter(w => w.status === 'active').length,
      inactive: workflows.filter(w => w.status === 'inactive').length,
      error: workflows.filter(w => w.status === 'error').length,
      unknown: workflows.filter(w => w.status === 'unknown').length
    };

    res.json({
      success: true,
      n8n: {
        ...n8nHealth,
        panelUrl: N8N_EXTERNAL_URL
      },
      workflows,
      summary,
      lastChecked: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching automation status:', error);
    res.status(500).json({
      success: false,
      message: 'Kunde inte hämta automatiseringsstatus',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

/**
 * POST /api/automations/test/:workflowId
 * Testa en specifik workflow
 */
router.post('/test/:workflowId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { workflowId } = req.params;

    if (!N8N_API_KEY) {
      return res.status(400).json({
        success: false,
        message: 'N8N API-nyckel saknas'
      });
    }

    // Hämta workflow från n8n för att få webhook path
    try {
      const workflowResponse = await axios.get(`${N8N_INTERNAL_URL}/api/v1/workflows/${workflowId}`, {
        timeout: 5000,
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });

      const workflow = workflowResponse.data;
      const webhookNode = workflow.nodes?.find((n: any) => n.type?.includes('webhook'));

      if (!webhookNode?.parameters?.path) {
        return res.json({
          success: false,
          message: `Workflow "${workflow.name}" har ingen webhook att testa`
        });
      }

      const webhookPath = `/webhook/${webhookNode.parameters.path}`;
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'vilches-app-dashboard'
      };

      const response = await axios.post(
        `${N8N_INTERNAL_URL}${webhookPath}`,
        testPayload,
        { timeout: 10000 }
      );

      res.json({
        success: true,
        message: `Workflow "${workflow.name}" testades framgångsrikt`,
        response: response.data
      });
    } catch (error: any) {
      res.json({
        success: false,
        message: 'Workflow kunde inte testas',
        error: error.message
      });
    }

  } catch (error) {
    console.error('Error testing workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Kunde inte testa workflow'
    });
  }
});

/**
 * GET /api/automations/executions
 * Hämta senaste körningar (kräver n8n API-nyckel)
 */
router.get('/executions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!N8N_API_KEY) {
      return res.json({
        success: true,
        executions: [],
        message: 'N8N API-nyckel krävs för att hämta körningshistorik'
      });
    }

    const response = await axios.get(`${N8N_INTERNAL_URL}/api/v1/executions`, {
      timeout: 5000,
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
      params: { limit: 20 }
    });

    const executions = (response.data?.data || []).map((exec: any) => ({
      id: exec.id,
      workflowName: exec.workflowData?.name || 'Okänd',
      status: exec.finished ? (exec.stoppedAt ? 'success' : 'running') : 'failed',
      startedAt: exec.startedAt,
      finishedAt: exec.stoppedAt,
      mode: exec.mode
    }));

    res.json({
      success: true,
      executions
    });

  } catch (error) {
    console.error('Error fetching executions:', error);
    res.json({
      success: true,
      executions: [],
      message: 'Kunde inte hämta körningshistorik'
    });
  }
});

export default router;
