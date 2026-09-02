import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = 'http://localhost:5555';

export default function AdminDashboardScreen({ route, navigation }) {
  const { roomId } = route.params;
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setLoading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        name: result.assets[0].name,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const res = await axios.post(`${BACKEND_URL}/api/${type}/upload/${roomId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        Alert.alert('Success', `${type} data uploaded successfully`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', `Failed to upload ${type} data`);
    } finally {
      setLoading(false);
    }
  };

  const startAuction = () => {
    navigation.navigate('LiveAuction', { roomId, isAdmin: true });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={40} color="#4f46e5" style={{ marginBottom: 10 }} />
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Room Code: <Text style={styles.roomCode}>{roomId}</Text></Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="people-outline" size={24} color="#0f172a" />
          <Text style={styles.cardTitle}>Upload Players</Text>
        </View>
        <Text style={styles.cardDesc}>Upload an Excel (.xlsx) file containing the players to be auctioned.</Text>
        <TouchableOpacity 
          style={styles.uploadBtn} 
          onPress={() => handleFileUpload('players')}
          disabled={loading}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#4f46e5" style={{ marginRight: 8 }} />
          <Text style={styles.uploadBtnText}>{loading ? 'UPLOADING...' : 'UPLOAD PLAYERS'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="business-outline" size={24} color="#0f172a" />
          <Text style={styles.cardTitle}>Upload Teams</Text>
        </View>
        <Text style={styles.cardDesc}>Upload an Excel (.xlsx) file containing the participating teams and their budgets.</Text>
        <TouchableOpacity 
          style={styles.uploadBtn} 
          onPress={() => handleFileUpload('teams')}
          disabled={loading}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#4f46e5" style={{ marginRight: 8 }} />
          <Text style={styles.uploadBtnText}>{loading ? 'UPLOADING...' : 'UPLOAD TEAMS'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, styles.highlightCard]}>
        <View style={styles.cardHeader}>
          <Ionicons name="hammer-outline" size={24} color="#10b981" />
          <Text style={styles.cardTitle}>Start Auction</Text>
        </View>
        <Text style={styles.cardDesc}>Once players and teams are uploaded, you can begin the live auction.</Text>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={startAuction}
          disabled={loading}
        >
          <LinearGradient 
            colors={['#10b981', '#34d399']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 0 }} 
            style={styles.buttonGradient}
          >
            <Text style={styles.actionBtnText}>ENTER LIVE AUCTION</Text>
            <Ionicons name="play-circle-outline" size={22} color="#fff" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  roomCode: {
    color: '#4f46e5',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 3,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  highlightCard: {
    borderColor: '#e0e7ff',
    borderWidth: 2,
    backgroundColor: '#f8fafc',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#e0e7ff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  uploadBtnText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
