/**
 * Conversation List Component
 * 
 * Displays a list of user's conversations in the sidebar.
 * Features:
 * - List all conversations
 * - Create new conversation
 * - Select existing conversation
 * - Delete conversations
 * - Search/filter conversations
 * - Real-time updates
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Button,
  TextField,
  Menu,
  MenuItem,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add,
  ChatBubbleOutline,
  MoreVert,
  Search,
  Delete,
  Edit,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { conversationService } from '../services/conversation.service';
import { useSnackbar } from '../contexts/SnackbarContext';
import { webSocketService } from '../services/websocket.service';

// Type definitions
interface Conversation {
  id: string;
  title: string;
  context: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ConversationListProps {
  selectedConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  selectedConversationId,
  onConversationSelect,
}) => {
  const { showSnackbar } = useSnackbar();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMenuConversation, setSelectedMenuConversation] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');

  /**
   * Load conversations from the API
   */
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await conversationService.getConversations();
      setConversations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
      showSnackbar('Failed to load conversations', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  // WebSocket event handlers for real-time conversation updates
  useEffect(() => {
    const handleConversationCreated = (conversation: Conversation) => {
      setConversations(prev => {
        // Check if conversation already exists to avoid duplicates
        const exists = prev.some(c => c.id === conversation.id);
        if (exists) return prev;
        
        return [conversation, ...prev];
      });
    };

    const handleConversationUpdated = (conversation: Conversation) => {
      setConversations(prev => {
        return prev.map(c => 
          c.id === conversation.id 
            ? { ...c, ...conversation }
            : c
        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });
    };

    const handleConversationDeleted = (data: { conversationId: string }) => {
      setConversations(prev => {
        return prev.filter(c => c.id !== data.conversationId);
      });
    };

    // Add WebSocket event listeners
    webSocketService.on('conversation_created', handleConversationCreated);
    webSocketService.on('conversation_updated', handleConversationUpdated);
    webSocketService.on('conversation_deleted', handleConversationDeleted);

    // Cleanup
    return () => {
      webSocketService.off('conversation_created', handleConversationCreated);
      webSocketService.off('conversation_updated', handleConversationUpdated);
      webSocketService.off('conversation_deleted', handleConversationDeleted);
    };
  }, []);

  /**
   * Create a new conversation
   */
  const handleCreateConversation = async () => {
    try {
      const newConversation = await conversationService.createConversation({
        title: 'New Conversation',
      });
      
      // Note: Don't add to list here - WebSocket will handle it for real-time sync
      // This ensures all tabs see the new conversation simultaneously
      
      // Select the new conversation
      onConversationSelect(newConversation.id);
      
      showSnackbar('New conversation created', 'success');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to create conversation', 'error');
    }
  };

  /**
   * Handle conversation menu open
   */
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, conversationId: string) => {
    event.stopPropagation(); // Prevent conversation selection
    setMenuAnchor(event.currentTarget);
    setSelectedMenuConversation(conversationId);
  };

  /**
   * Handle conversation menu close
   */
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMenuConversation(null);
  };

  /**
   * Open rename dialog
   */
  const handleRenameConversation = () => {
    if (!selectedMenuConversation) return;
    
    const conversation = conversations.find(c => c.id === selectedMenuConversation);
    if (conversation) {
      setRenameTitle(conversation.title);
      setRenameDialogOpen(true);
    }
    // Close the menu but keep selectedMenuConversation for the rename operation
    setMenuAnchor(null);
  };

  /**
   * Handle rename dialog close
   */
  const handleRenameClose = () => {
    setRenameDialogOpen(false);
    setRenameTitle('');
    setSelectedMenuConversation(null);
  };

  /**
   * Save renamed conversation
   */
  const handleRenameSave = async () => {
    if (!selectedMenuConversation || !renameTitle.trim()) return;

    try {
      await conversationService.updateConversation(selectedMenuConversation, {
        title: renameTitle.trim(),
      });
      
      // Note: Don't update list here - WebSocket will handle it for real-time sync
      // This ensures all tabs see the rename simultaneously
      
      showSnackbar('Conversation renamed', 'success');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to rename conversation', 'error');
    } finally {
      handleRenameClose();
    }
  };

  /**
   * Delete a conversation
   */
  const handleDeleteConversation = async () => {
    if (!selectedMenuConversation) return;

    try {
      await conversationService.deleteConversation(selectedMenuConversation);
      
      // Note: Don't remove from list here - WebSocket will handle it for real-time sync
      // This ensures all tabs see the deletion simultaneously
      
      // If this was the selected conversation, clear selection
      if (selectedConversationId === selectedMenuConversation) {
        onConversationSelect('');
      }
      
      showSnackbar('Conversation deleted', 'success');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to delete conversation', 'error');
    } finally {
      handleMenuClose();
    }
  };

  /**
   * Filter conversations based on search term
   */
  const filteredConversations = conversations.filter(conversation =>
    conversation.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Format conversation date for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 24 * 7) {
      return format(date, 'EEE');
    } else {
      return format(date, 'MMM dd');
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* New Conversation Button */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateConversation}
          sx={{ mb: 2 }}
        >
          New Conversation
        </Button>

        {/* Search Field */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Box>

      {/* Conversations List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          // Loading state
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          // Error state
          <Box sx={{ p: 2 }}>
            <Alert severity="error" action={
              <Button color="inherit" size="small" onClick={loadConversations}>
                Retry
              </Button>
            }>
              {error}
            </Alert>
          </Box>
        ) : filteredConversations.length === 0 ? (
          // Empty state
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <ChatBubbleOutline sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'No conversations found' : 'No conversations yet'}
            </Typography>
            {!searchTerm && (
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Create your first conversation to get started
              </Typography>
            )}
          </Box>
        ) : (
          // Conversations list
          <List sx={{ pt: 0 }}>
            {filteredConversations.map((conversation) => (
              <ListItem key={conversation.id} disablePadding>
                <ListItemButton
                  selected={selectedConversationId === conversation.id}
                  onClick={() => onConversationSelect(conversation.id)}
                  sx={{
                    borderRadius: 1,
                    mx: 1,
                    mb: 0.5,
                  }}
                >
                  <ListItemIcon>
                    <ChatBubbleOutline />
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                          {conversation.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(conversation.updated_at)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" noWrap>
                        Last updated {formatDate(conversation.updated_at)}
                      </Typography>
                    }
                  />
                  
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, conversation.id)}
                    sx={{ ml: 1 }}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Conversation Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleRenameConversation}>
          <Edit sx={{ mr: 1 }} />
          Rename
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteConversation} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog 
        open={renameDialogOpen} 
        onClose={handleRenameClose}
        maxWidth="sm"
        fullWidth
        disableRestoreFocus
        aria-labelledby="rename-dialog-title"
      >
        <DialogTitle id="rename-dialog-title">Rename Conversation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Conversation Title"
            fullWidth
            variant="outlined"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRenameSave();
              }
            }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRenameClose}>Cancel</Button>
          <Button 
            onClick={handleRenameSave} 
            variant="contained"
            disabled={!renameTitle.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConversationList;