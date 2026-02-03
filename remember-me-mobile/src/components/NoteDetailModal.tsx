import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Note } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

interface NoteDetailModalProps {
  visible: boolean;
  note: Note | null;
  onClose: () => void;
  onSave: (id: string, text: string, source?: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export function NoteDetailModal({
  visible,
  note,
  onClose,
  onSave,
  onDelete,
}: NoteDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSource, setNoteSource] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Handle animation when visibility changes
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      // Animate in: fade overlay and slide content
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out: fade overlay and slide content
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  // Reset state when note changes or modal opens
  useEffect(() => {
    if (note && visible) {
      setNoteText(note.text);
      setNoteSource(note.source || '');
      setIsEditing(false);
    }
  }, [note, visible]);

  const handleSave = async () => {
    if (!noteText.trim() || isSubmitting || !note) return;

    setIsSubmitting(true);
    try {
      await onSave(note.id, noteText.trim(), noteSource.trim() || undefined);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!note) return;

    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete(note.id);
          onClose();
        },
      },
    ]);
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleCancelEdit = () => {
    if (note) {
      setNoteText(note.text);
      setNoteSource(note.source || '');
    }
    setIsEditing(false);
  };

  if (!note) return null;

  return (
    <Modal
      visible={modalVisible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[styles.modalOverlay, { opacity: overlayOpacity }]}
          />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Note' : 'Note'}
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {isEditing ? (
                <>
                  <TextInput
                    style={styles.textInput}
                    placeholder="What do you want to remember?"
                    placeholderTextColor="#999"
                    value={noteText}
                    onChangeText={setNoteText}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    autoFocus
                  />
                  <TextInput
                    style={[styles.textInput, styles.sourceInput]}
                    placeholder="Source (optional)"
                    placeholderTextColor="#999"
                    value={noteSource}
                    onChangeText={setNoteSource}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.noteText}>{note.text}</Text>
                  {note.source && (
                    <Text style={styles.noteSource}>— {note.source}</Text>
                  )}
                  <View style={styles.metaContainer}>
                    <Text style={styles.metaText}>
                      Created: {new Date(note.createdAt).toLocaleDateString()}
                    </Text>
                    {note.updatedAt !== note.createdAt && (
                      <Text style={styles.metaText}>
                        Updated: {new Date(note.updatedAt).toLocaleDateString()}
                      </Text>
                    )}
                    {!note.isSynced && (
                      <View style={styles.unsyncedBadge}>
                        <Text style={styles.unsyncedText}>Not synced</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={handleCancelEdit}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.saveButton,
                      (!noteText.trim() || isSubmitting) && styles.disabledButton,
                    ]}
                    onPress={handleSave}
                    disabled={!noteText.trim() || isSubmitting}
                  >
                    <Text style={styles.saveButtonText}>
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={handleDelete}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => setIsEditing(true)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    lineHeight: 26,
  },
  scrollContent: {
    maxHeight: 300,
  },
  noteText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 28,
  },
  noteSource: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 16,
  },
  metaContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  metaText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  unsyncedBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  unsyncedText: {
    fontSize: 11,
    color: '#ff9800',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 150,
    backgroundColor: '#fafafa',
  },
  sourceInput: {
    minHeight: 50,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#c8e6c9',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  deleteButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
