import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://snkpl-app-auction.onrender.com';

export default function LandingScreen({ navigation }) {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/room/create`, { adminId: 'admin_user' });
      if (res.data.success) {
        navigation.navigate('AdminDashboard', { roomId: res.data.room.roomId });
      }
    } catch (error) {
      console.error('Error creating room', error);
      alert('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomCode) {
      alert('Please enter a room code');
      return;
    }
    try {
      const res = await axios.get(`${BACKEND_URL}/api/room/${roomCode}`);
      if (res.data.success) {
        navigation.navigate('LiveAuction', { roomId: roomCode, isAdmin: false });
      }
    } catch (error) {
      console.error('Room not found', error);
      alert('Invalid Room Code');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <TouchableOpacity 
        style={styles.settingsIcon} 
        onPress={() => navigation.navigate('Settings')}
      >
        <Ionicons name="settings-outline" size={28} color="#F8FAFC" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image 
          source={require('../../assets/logo.jpeg')} 
          style={styles.logo} 
          resizeMode="cover" 
        />
        <Text style={styles.title}>SNKPL</Text>
        <Text style={styles.subtitle}>The Ultimate Sports Auction Platform</Text>
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="create-outline" size={24} color="#4f46e5" />
            <Text style={styles.cardTitle}>Host an Auction</Text>
          </View>
          <Text style={styles.cardDesc}>Create a new room and manage players, teams, and live bidding.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={createRoom} disabled={loading}>
            <LinearGradient colors={['#4f46e5', '#6366f1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
              <Text style={styles.btnText}>{loading ? 'CREATING...' : 'CREATE ROOM'}</Text>
              <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="enter-outline" size={24} color="#10b981" />
            <Text style={styles.cardTitle}>Join an Auction</Text>
          </View>
          <Text style={styles.cardDesc}>Enter a 6-digit room code to participate in a live auction.</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="keypad-outline" size={24} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="123456"
              placeholderTextColor="#cbd5e1"
              value={roomCode}
              onChangeText={setRoomCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          
          <TouchableOpacity style={styles.joinBtn} onPress={joinRoom}>
            <LinearGradient colors={['#10b981', '#34d399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
              <Text style={styles.btnText}>JOIN AUCTION</Text>
              <Ionicons name="arrow-forward-circle-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  settingsIcon: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 25,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#334155'
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 30,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginLeft: 10,
  },
  cardDesc: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 25,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: '#334155',
    marginBottom: 25,
    paddingBottom: 5,
  },
  inputIcon: {
    marginRight: 15,
  },
  input: {
    flex: 1,
    fontSize: 32,
    color: '#F8FAFC',
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  createBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  joinBtn: {
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
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
