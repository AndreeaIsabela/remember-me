import React, { useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Text,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNotes } from '../contexts/NotesContext';
import { useAuth } from '../contexts/AuthContext';
import { AddNoteModal } from '../components/AddNoteModal';
import { NoteDetailModal } from '../components/NoteDetailModal';
import { SwipeableNoteCard } from '../components/SwipeableNoteCard';
import { Note } from '../types';

type RootStackParamList = {
  Notes: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  Settings: undefined;
  Schedule: undefined;
};

type NotesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Notes'
>;

export function NotesScreen() {
  const navigation = useNavigation<NotesScreenNavigationProp>();
  const { notes, isLoading, addNote, updateNote, deleteNote, syncNotes } = useNotes();
  const { isAuthenticated, user } = useAuth();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleNotePress = (note: Note) => {
    setSelectedNote(note);
    setIsDetailModalVisible(true);
  };

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setIsDetailModalVisible(true);
  };

  const handleDeleteNote = (note: Note) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteNote(note.id),
      },
    ]);
  };

  const renderNote = ({ item }: { item: Note }) => (
    <SwipeableNoteCard
      note={item}
      onPress={() => handleNotePress(item)}
      onEdit={() => handleEditNote(item)}
      onDelete={() => handleDeleteNote(item)}
    />
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Remember Me</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>
      {isAuthenticated && user && (
        <Text style={styles.welcomeText}>Welcome, {user.name}</Text>
      )}
      {!isAuthenticated && (
        <Text style={styles.offlineHint}>
          Notes are saved locally. Login to sync across devices.
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderNote}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={syncNotes}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptyText}>
              Tap the + button to add your first note
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsAddModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Note Modal */}
      <AddNoteModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSave={addNote}
      />

      {/* Note Detail Modal */}
      <NoteDetailModal
        visible={isDetailModalVisible}
        note={selectedNote}
        onClose={() => {
          setIsDetailModalVisible(false);
          setSelectedNote(null);
        }}
        onSave={updateNote}
        onDelete={deleteNote}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  settingsButton: {
    padding: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  offlineHint: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
    fontStyle: 'italic',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 34,
    fontWeight: '300',
  },
});
