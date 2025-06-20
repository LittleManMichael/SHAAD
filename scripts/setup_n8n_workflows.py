#!/usr/bin/env python3
"""
Setup default n8n workflows for SHAAD
This script creates commonly used workflows that the AI assistant can trigger
"""

import requests
import json
import os
from typing import Dict, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../.env')

class N8NWorkflowSetup:
    def __init__(self):
        self.base_url = f"http://{os.getenv('N8N_HOST', 'localhost')}:{os.getenv('N8N_PORT', '5678')}"
        self.auth = None
        
        # Setup authentication
        if os.getenv('N8N_API_KEY'):
            self.headers = {
                'X-N8N-API-KEY': os.getenv('N8N_API_KEY'),
                'Content-Type': 'application/json'
            }
        else:
            username = os.getenv('N8N_BASIC_AUTH_USER', '')
            password = os.getenv('N8N_BASIC_AUTH_PASSWORD', '')
            if username and password:
                self.auth = (username, password)
            self.headers = {'Content-Type': 'application/json'}
    
    def create_workflow(self, workflow_data: Dict) -> str:
        """Create a workflow in n8n"""
        response = requests.post(
            f"{self.base_url}/api/v1/workflows",
            json=workflow_data,
            headers=self.headers,
            auth=self.auth
        )
        
        if response.status_code == 201:
            return response.json()['data']['id']
        else:
            print(f"Failed to create workflow: {response.text}")
            return None
    
    def workflow_exists(self, name: str) -> bool:
        """Check if a workflow already exists"""
        response = requests.get(
            f"{self.base_url}/api/v1/workflows",
            headers=self.headers,
            auth=self.auth
        )
        
        if response.status_code == 200:
            workflows = response.json()['data']
            return any(w['name'] == name for w in workflows)
        return False

    def create_send_notification_workflow(self):
        """Create a workflow to send notifications via various channels"""
        workflow_name = "SHAAD_Send_Notification"
        
        if self.workflow_exists(workflow_name):
            print(f"✓ Workflow '{workflow_name}' already exists")
            return
        
        workflow = {
            "name": workflow_name,
            "active": True,
            "nodes": [
                {
                    "parameters": {},
                    "name": "Start",
                    "type": "n8n-nodes-base.start",
                    "typeVersion": 1,
                    "position": [250, 300]
                },
                {
                    "parameters": {
                        "conditions": {
                            "string": [
                                {
                                    "value1": "={{$json[\"channel\"]}}",
                                    "operation": "equals",
                                    "value2": "email"
                                }
                            ]
                        }
                    },
                    "name": "Route by Channel",
                    "type": "n8n-nodes-base.if",
                    "typeVersion": 1,
                    "position": [450, 300]
                },
                {
                    "parameters": {
                        "resource": "message",
                        "operation": "send",
                        "from": "=SHAAD Assistant <noreply@shaad.local>",
                        "to": "={{$json[\"recipient\"]}}",
                        "subject": "={{$json[\"subject\"]}}",
                        "text": "={{$json[\"message\"]}}"
                    },
                    "name": "Send Email",
                    "type": "n8n-nodes-base.emailSend",
                    "typeVersion": 1,
                    "position": [650, 200]
                },
                {
                    "parameters": {
                        "url": "={{$json[\"webhook_url\"]}}",
                        "requestMethod": "POST",
                        "jsonParameters": True,
                        "options": {},
                        "bodyParametersJson": "={{JSON.stringify($json)}}"
                    },
                    "name": "Send to Webhook",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 1,
                    "position": [650, 400]
                }
            ],
            "connections": {
                "Start": {
                    "main": [[{"node": "Route by Channel", "type": "main", "index": 0}]]
                },
                "Route by Channel": {
                    "main": [
                        [{"node": "Send Email", "type": "main", "index": 0}],
                        [{"node": "Send to Webhook", "type": "main", "index": 0}]
                    ]
                }
            }
        }
        
        workflow_id = self.create_workflow(workflow)
        if workflow_id:
            print(f"✓ Created workflow '{workflow_name}' with ID: {workflow_id}")

    def create_web_search_workflow(self):
        """Create a workflow to search the web and return results"""
        workflow_name = "SHAAD_Web_Search"
        
        if self.workflow_exists(workflow_name):
            print(f"✓ Workflow '{workflow_name}' already exists")
            return
        
        workflow = {
            "name": workflow_name,
            "active": True,
            "nodes": [
                {
                    "parameters": {},
                    "name": "Start",
                    "type": "n8n-nodes-base.start",
                    "typeVersion": 1,
                    "position": [250, 300]
                },
                {
                    "parameters": {
                        "url": "https://api.duckduckgo.com/",
                        "requestMethod": "GET",
                        "queryParametersUi": {
                            "parameter": [
                                {
                                    "name": "q",
                                    "value": "={{$json[\"query\"]}}"
                                },
                                {
                                    "name": "format",
                                    "value": "json"
                                },
                                {
                                    "name": "no_html",
                                    "value": "1"
                                }
                            ]
                        }
                    },
                    "name": "Search DuckDuckGo",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 1,
                    "position": [450, 300]
                },
                {
                    "parameters": {
                        "mode": "runOnceForEachItem",
                        "jsCode": "// Format search results\nconst results = $input.item.json;\nconst formatted = {\n  query: $node[\"Start\"].json[\"query\"],\n  results: []\n};\n\nif (results.RelatedTopics) {\n  formatted.results = results.RelatedTopics.slice(0, 5).map(topic => ({\n    title: topic.Text || '',\n    url: topic.FirstURL || '',\n    description: topic.Text || ''\n  }));\n}\n\nreturn formatted;"
                    },
                    "name": "Format Results",
                    "type": "n8n-nodes-base.code",
                    "typeVersion": 1,
                    "position": [650, 300]
                }
            ],
            "connections": {
                "Start": {
                    "main": [[{"node": "Search DuckDuckGo", "type": "main", "index": 0}]]
                },
                "Search DuckDuckGo": {
                    "main": [[{"node": "Format Results", "type": "main", "index": 0}]]
                }
            }
        }
        
        workflow_id = self.create_workflow(workflow)
        if workflow_id:
            print(f"✓ Created workflow '{workflow_name}' with ID: {workflow_id}")

    def create_home_automation_workflow(self):
        """Create a workflow for home automation control"""
        workflow_name = "SHAAD_Home_Control"
        
        if self.workflow_exists(workflow_name):
            print(f"✓ Workflow '{workflow_name}' already exists")
            return
        
        workflow = {
            "name": workflow_name,
            "active": True,
            "nodes": [
                {
                    "parameters": {},
                    "name": "Start",
                    "type": "n8n-nodes-base.start",
                    "typeVersion": 1,
                    "position": [250, 300]
                },
                {
                    "parameters": {
                        "conditions": {
                            "string": [
                                {
                                    "value1": "={{$json[\"device_type\"]}}",
                                    "operation": "equals",
                                    "value2": "light"
                                }
                            ]
                        }
                    },
                    "name": "Device Router",
                    "type": "n8n-nodes-base.if",
                    "typeVersion": 1,
                    "position": [450, 300]
                },
                {
                    "parameters": {
                        "url": "={{$json[\"device_api_url\"]}}",
                        "requestMethod": "POST",
                        "jsonParameters": True,
                        "options": {},
                        "bodyParametersJson": "={\n  \"action\": \"{{$json[\"action\"]}}\",\n  \"value\": \"{{$json[\"value\"]}}\"\n}"
                    },
                    "name": "Control Device",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 1,
                    "position": [650, 300]
                },
                {
                    "parameters": {
                        "mode": "runOnceForEachItem",
                        "jsCode": "// Log action for future learning\nconst action = $input.item.json;\nreturn {\n  success: true,\n  device: action.device_name,\n  action: action.action,\n  timestamp: new Date().toISOString()\n};"
                    },
                    "name": "Log Action",
                    "type": "n8n-nodes-base.code",
                    "typeVersion": 1,
                    "position": [850, 300]
                }
            ],
            "connections": {
                "Start": {
                    "main": [[{"node": "Device Router", "type": "main", "index": 0}]]
                },
                "Device Router": {
                    "main": [
                        [{"node": "Control Device", "type": "main", "index": 0}],
                        [{"node": "Control Device", "type": "main", "index": 0}]
                    ]
                },
                "Control Device": {
                    "main": [[{"node": "Log Action", "type": "main", "index": 0}]]
                }
            }
        }
        
        workflow_id = self.create_workflow(workflow)
        if workflow_id:
            print(f"✓ Created workflow '{workflow_name}' with ID: {workflow_id}")

    def create_schedule_task_workflow(self):
        """Create a workflow to schedule tasks and reminders"""
        workflow_name = "SHAAD_Schedule_Task"
        
        if self.workflow_exists(workflow_name):
            print(f"✓ Workflow '{workflow_name}' already exists")
            return
        
        workflow = {
            "name": workflow_name,
            "active": True,
            "nodes": [
                {
                    "parameters": {},
                    "name": "Start",
                    "type": "n8n-nodes-base.start",
                    "typeVersion": 1,
                    "position": [250, 300]
                },
                {
                    "parameters": {
                        "mode": "runOnceForEachItem",
                        "jsCode": "// Store task in database or schedule system\nconst task = $input.item.json;\n\n// Parse the scheduled time\nconst scheduledTime = new Date(task.scheduled_time);\nconst now = new Date();\n\n// Calculate delay in milliseconds\nconst delay = scheduledTime - now;\n\nreturn {\n  task_id: Math.random().toString(36).substr(2, 9),\n  title: task.title,\n  description: task.description,\n  scheduled_time: scheduledTime.toISOString(),\n  delay_ms: delay,\n  user_id: task.user_id,\n  notification_method: task.notification_method || 'email'\n};"
                    },
                    "name": "Process Task",
                    "type": "n8n-nodes-base.code",
                    "typeVersion": 1,
                    "position": [450, 300]
                },
                {
                    "parameters": {
                        "amount": "={{$json[\"delay_ms\"]}}",
                        "unit": "milliseconds"
                    },
                    "name": "Wait",
                    "type": "n8n-nodes-base.wait",
                    "typeVersion": 1,
                    "position": [650, 300]
                },
                {
                    "parameters": {
                        "workflowId": "={{$parameter[\"notification_workflow_id\"]}}",
                        "workflowParameters": "={\n  \"channel\": \"{{$json[\"notification_method\"]}}\",\n  \"recipient\": \"{{$json[\"user_id\"]}}\",\n  \"subject\": \"Reminder: {{$json[\"title\"]}}\",\n  \"message\": \"{{$json[\"description\"]}}\"\n}"
                    },
                    "name": "Send Reminder",
                    "type": "n8n-nodes-base.executeWorkflow",
                    "typeVersion": 1,
                    "position": [850, 300]
                }
            ],
            "connections": {
                "Start": {
                    "main": [[{"node": "Process Task", "type": "main", "index": 0}]]
                },
                "Process Task": {
                    "main": [[{"node": "Wait", "type": "main", "index": 0}]]
                },
                "Wait": {
                    "main": [[{"node": "Send Reminder", "type": "main", "index": 0}]]
                }
            }
        }
        
        workflow_id = self.create_workflow(workflow)
        if workflow_id:
            print(f"✓ Created workflow '{workflow_name}' with ID: {workflow_id}")

    def setup_all_workflows(self):
        """Setup all default workflows"""
        print("Setting up n8n workflows for SHAAD...")
        print("=" * 50)
        
        self.create_send_notification_workflow()
        self.create_web_search_workflow()
        self.create_home_automation_workflow()
        self.create_schedule_task_workflow()
        
        print("=" * 50)
        print("✓ Workflow setup complete!")
        print("\nAvailable workflows:")
        print("- SHAAD_Send_Notification: Send notifications via email, webhook, etc.")
        print("- SHAAD_Web_Search: Search the web for information")
        print("- SHAAD_Home_Control: Control smart home devices")
        print("- SHAAD_Schedule_Task: Schedule tasks and reminders")

if __name__ == "__main__":
    setup = N8NWorkflowSetup()
    setup.setup_all_workflows()