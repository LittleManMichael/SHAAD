/**
 * n8n Dashboard Component
 * 
 * Manages n8n workflow integration and monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  PlayArrow,
  Stop,
  Edit,
  Delete,
  Add,
  Refresh,
  Launch,
  CheckCircle,
  Error,
  Schedule,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';

interface Workflow {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastExecution?: string;
  executionCount: number;
  description?: string;
}

interface WorkflowExecution {
  id: string;
  workflowName: string;
  status: 'success' | 'error' | 'running';
  startTime: string;
  endTime?: string;
  duration?: number;
}

const N8nDashboard: React.FC = () => {
  const { showSnackbar } = useSnackbar();
  
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: '1',
      name: 'SHAAD Webhook Handler',
      status: 'active',
      lastExecution: '2025-07-04T10:30:00Z',
      executionCount: 45,
      description: 'Handles incoming webhooks from SHAAD conversations'
    },
    {
      id: '2',
      name: 'Discord Notification Sender',
      status: 'active',
      lastExecution: '2025-07-04T11:15:00Z',
      executionCount: 23,
      description: 'Sends notifications to Discord channels'
    },
    {
      id: '3',
      name: 'Data Backup Workflow',
      status: 'inactive',
      lastExecution: '2025-07-03T23:00:00Z',
      executionCount: 12,
      description: 'Automatically backs up conversation data'
    }
  ]);

  const [executions, setExecutions] = useState<WorkflowExecution[]>([
    {
      id: '1',
      workflowName: 'SHAAD Webhook Handler',
      status: 'success',
      startTime: '2025-07-04T10:30:00Z',
      endTime: '2025-07-04T10:30:05Z',
      duration: 5000
    },
    {
      id: '2',
      workflowName: 'Discord Notification Sender',
      status: 'success',
      startTime: '2025-07-04T11:15:00Z',
      endTime: '2025-07-04T11:15:03Z',
      duration: 3000
    },
    {
      id: '3',
      workflowName: 'Data Backup Workflow',
      status: 'error',
      startTime: '2025-07-03T23:00:00Z',
      endTime: '2025-07-03T23:00:10Z',
      duration: 10000
    }
  ]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'running':
        return <Schedule color="info" />;
      default:
        return <Schedule color="disabled" />;
    }
  };

  const getStatusColor = (status: string): "success" | "error" | "warning" | "info" | "default" => {
    switch (status) {
      case 'active':
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'running':
        return 'info';
      case 'inactive':
        return 'warning';
      default:
        return 'default';
    }
  };

  const toggleWorkflow = (workflowId: string) => {
    setWorkflows(prev =>
      prev.map(workflow =>
        workflow.id === workflowId
          ? { ...workflow, status: workflow.status === 'active' ? 'inactive' : 'active' }
          : workflow
      )
    );
    showSnackbar('Workflow status updated', 'success');
  };

  const executeWorkflow = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      showSnackbar(`Executing workflow: ${workflow.name}`, 'info');
      // TODO: Implement actual workflow execution
    }
  };

  const deleteWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    showSnackbar('Workflow deleted', 'success');
  };

  const createWorkflow = () => {
    if (newWorkflowName.trim()) {
      const newWorkflow: Workflow = {
        id: Date.now().toString(),
        name: newWorkflowName,
        status: 'inactive',
        executionCount: 0,
        description: 'New workflow created from SHAAD dashboard'
      };
      setWorkflows(prev => [...prev, newWorkflow]);
      setNewWorkflowName('');
      setCreateDialogOpen(false);
      showSnackbar('Workflow created successfully', 'success');
    }
  };

  const openN8nEditor = () => {
    window.open('http://localhost:5678', '_blank');
  };

  const refreshData = () => {
    showSnackbar('Refreshing workflow data...', 'info');
    // TODO: Implement data refresh from n8n API
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          n8n Workflows
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={refreshData}
          >
            Refresh
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Launch />}
            onClick={openN8nEditor}
          >
            Open n8n Editor
          </Button>
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Workflow
          </Button>
        </Box>
      </Box>

      {/* Connection Status */}
      <Alert 
        severity="success" 
        sx={{ mb: 3 }}
        action={
          <Button color="inherit" size="small" onClick={openN8nEditor}>
            OPEN n8n
          </Button>
        }
      >
        Connected to n8n instance at localhost:5678
      </Alert>

      <Grid container spacing={3}>
        {/* Workflow Cards */}
        <Grid size={12}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Active Workflows
          </Typography>
          
          <Grid container spacing={2}>
            {workflows.map((workflow) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={workflow.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="div" noWrap>
                        {workflow.name}
                      </Typography>
                      {getStatusIcon(workflow.status)}
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {workflow.description}
                    </Typography>
                    
                    <Chip
                      label={workflow.status}
                      color={getStatusColor(workflow.status)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    
                    <Typography variant="caption" display="block" color="text.secondary">
                      Executions: {workflow.executionCount}
                    </Typography>
                    
                    {workflow.lastExecution && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Last run: {new Date(workflow.lastExecution).toLocaleString()}
                      </Typography>
                    )}
                  </CardContent>
                  
                  <CardActions>
                    <IconButton
                      size="small"
                      onClick={() => executeWorkflow(workflow.id)}
                      color="primary"
                    >
                      <PlayArrow />
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      onClick={() => toggleWorkflow(workflow.id)}
                      color={workflow.status === 'active' ? 'error' : 'success'}
                    >
                      {workflow.status === 'active' ? <Stop /> : <PlayArrow />}
                    </IconButton>
                    
                    <IconButton size="small" color="default">
                      <Edit />
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteWorkflow(workflow.id)}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Recent Executions */}
        <Grid size={12}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Executions
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Workflow</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Start Time</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {executions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>{execution.workflowName}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(execution.status)}
                        label={execution.status}
                        color={getStatusColor(execution.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(execution.startTime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {execution.duration ? `${execution.duration}ms` : '-'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <Launch />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* Create Workflow Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Workflow Name"
            fullWidth
            variant="outlined"
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={createWorkflow} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default N8nDashboard;