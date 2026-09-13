import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://snkpl-app-auction.onrender.com';

export default function AdminDashboardScreen({ route, navigation }) {
  const { roomId } = route.params;
  const [loading, setLoading] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');

  const handleSetBudget = async () => {
    if (!budgetAmount) return Alert.alert('Error', 'Please enter a budget amount');
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/teams/budget/${roomId}`, { budget: budgetAmount });
      if (res.data.success) {
        Alert.alert('Success', res.data.message);
        setBudgetAmount('');
      } else {
        Alert.alert('Error', 'Failed to set budget');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to set budget');
    } finally {
      setLoading(false);
    }
  };

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
          <Ionicons name="people-outline" size={24} color="#F8FAFC" />
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
          <Ionicons name="business-outline" size={24} color="#F8FAFC" />
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

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="wallet-outline" size={24} color="#F8FAFC" />
          <Text style={styles.cardTitle}>Set Global Budget</Text>
        </View>
        <Text style={styles.cardDesc}>Override and set the starting purse for all teams.</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.currencyPrefix}>₹</Text>
          <TextInput
            style={styles.input}
            placeholder="10000"
            placeholderTextColor="#94A3B8"
            value={budgetAmount}
            onChangeText={setBudgetAmount}
            keyboardType="number-pad"
          />
          <Text style={styles.currencySuffix}>L</Text>
        </View>

        <TouchableOpacity 
          style={styles.uploadBtn} 
          onPress={handleSetBudget}
          disabled={loading}
        >
          <Ionicons name="save-outline" size={20} color="#4f46e5" style={{ marginRight: 8 }} />
          <Text style={styles.uploadBtnText}>{loading ? 'SAVING...' : 'SET BUDGET'}</Text>
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
    backgroundColor: '#0F172A',
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
    color: '#F8FAFC',
    letterSpacing: 1,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  roomCode: {
    color: '#818CF8',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 3,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  highlightCard: {
    borderColor: '#4338CA',
    borderWidth: 2,
    backgroundColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginLeft: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#312E81',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  uploadBtnText: {
    color: '#818CF8',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#0F172A',
  },
  currencyPrefix: {
    color: '#94A3B8',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 10,
  },
  currencySuffix: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 20,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
});
