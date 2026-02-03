import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Note } from '../types';

interface SwipeableNoteCardProps {
  note: Note;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SwipeableNoteCard({
  note,
  onPress,
  onEdit,
  onDelete,
}: SwipeableNoteCardProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleEdit = () => {
    swipeableRef.current?.close();
    onEdit();
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    onDelete();
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionsContainer}>
        <Animated.View
          style={[
            styles.actionButtonsWrapper,
            {
              transform: [{ translateX }, { scale }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.actionButton, styles.editActionButton]}
            onPress={handleEdit}
          >
            <Text style={styles.actionButtonIcon}>✏️</Text>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteActionButton]}
            onPress={handleDelete}
          >
            <Text style={styles.actionButtonIcon}>🗑️</Text>
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={styles.noteCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.noteText} numberOfLines={4}>
          {note.text}
        </Text>
        {note.source && (
          <Text style={styles.noteSource} numberOfLines={1}>
            — {note.source}
          </Text>
        )}
        <View style={styles.noteFooter}>
          <Text style={styles.noteDate}>
            {new Date(note.createdAt).toLocaleDateString()}
          </Text>
          {!note.isSynced && (
            <View style={styles.unsyncedBadge}>
              <Text style={styles.unsyncedText}>Not synced</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  noteText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  noteSource: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 10,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  noteDate: {
    fontSize: 12,
    color: '#aaa',
  },
  unsyncedBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unsyncedText: {
    fontSize: 11,
    color: '#ff9800',
    fontWeight: '600',
  },
  rightActionsContainer: {
    width: 160,
    marginBottom: 12,
  },
  actionButtonsWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginLeft: 8,
  },
  editActionButton: {
    backgroundColor: '#e3f2fd',
  },
  deleteActionButton: {
    backgroundColor: '#ffebee',
  },
  actionButtonIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
