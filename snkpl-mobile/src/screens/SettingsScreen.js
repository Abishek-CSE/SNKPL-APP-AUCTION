import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = 'http://localhost:5555';

export default function SettingsScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedToken) setToken(storedToken);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUsername(user.username);
      }
    };
    loadData();
  }, []);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const payload = { username };
      if (password) payload.password = password;

      const res = await axios.put(`${BACKEND_URL}/api/auth/update`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        await AsyncStorage.setItem('userData', JSON.stringify(res.data.user));
        Alert.alert('Success', 'Profile updated successfully!');
        setPassword('');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Update failed';
      Alert.alert('Error', msg);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    navigation.replace('Login');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your profile and security</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>USERNAME</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your Username"
                placeholderTextColor="#94a3b8"
                value={username}
                onChangeText={setUsername}
              />
            </View>
          </View>
          
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>NEW PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Leave blank to keep current"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={handleUpdate}
            disabled={loading}
          >
            <LinearGradient 
              colors={['#4f46e5', '#6366f1']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 0 }} 
              style={styles.buttonGradient}
            >
              <Text style={styles.saveBtnText}>{loading ? 'SAVING...' : 'SAVE CHANGES'}</Text>
              <Ionicons name="save-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 30,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 30,
  },
  inputWrapper: {
    marginBottom: 25,
  },
  inputLabel: {
    color: '#4f46e5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    color: '#0f172a',
  },
  saveBtn: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4f46e5',
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
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  }
});
