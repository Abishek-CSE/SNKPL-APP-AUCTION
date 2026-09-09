import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import io from 'socket.io-client';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://snkpl-app-auction.onrender.com';

export default function LiveAuctionScreen({ route, navigation }) {
  const { roomId, isAdmin } = route.params;
  const [socket, setSocket] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.emit('join_room', roomId);

    newSocket.on('room_state', (state) => {
      setAuctionState(state);
      setLoading(false);
    });

    newSocket.on('bid_updated', (data) => {
      setAuctionState(prev => ({
        ...prev,
        currentBid: data.currentBid,
        highestBidder: data.highestBidder
      }));
    });

    newSocket.on('player_sold', (data) => {
      Alert.alert('Sold!', `Player sold to ${data.teamId} for ₹${data.amount}L`);
    });

    newSocket.on('error', (msg) => {
      Alert.alert('Error', msg);
    });

    return () => newSocket.disconnect();
  }, [roomId]);

  const placeBid = () => {
    if (socket) {
      // In a real app, the teamId would be derived from the logged-in user's team
      socket.emit('place_bid', { roomId, teamId: 'TestTeam1' });
    }
  };

  const sellPlayer = () => {
    if (socket && isAdmin) {
      socket.emit('sell_player', { roomId });
    }
  };

  const nextPlayer = () => {
    if (socket && isAdmin) {
      socket.emit('next_player', { roomId });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Connecting to Auction Room...</Text>
      </View>
    );
  }

  const currentPlayer = auctionState?.currentPlayer;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="radio-outline" size={28} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Live Auction</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ROOM: {roomId}</Text>
        </View>
      </View>

      {currentPlayer ? (
        <View style={styles.playerCard}>
          <View style={styles.playerHeader}>
            <Text style={styles.playerName}>{currentPlayer.name}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="star" size={12} color="#4f46e5" style={{ marginRight: 4 }} />
              <Text style={styles.roleText}>{currentPlayer.role}</Text>
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Ionicons name="cash-outline" size={20} color="#64748b" style={{ marginBottom: 4 }} />
              <Text style={styles.statLabel}>BASE PRICE</Text>
              <Text style={styles.statValue}>₹{currentPlayer.basePrice}L</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Ionicons name="podium-outline" size={20} color="#64748b" style={{ marginBottom: 4 }} />
              <Text style={styles.statLabel}>TIER</Text>
              <Text style={styles.statValue}>{currentPlayer.tier || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.bidSection}>
            <Text style={styles.currentBidLabel}>CURRENT HIGHEST BID</Text>
            <Text style={styles.currentBidAmount}>
              ₹{auctionState.currentBid}L
            </Text>
            {auctionState.highestBidder && (
              <View style={styles.bidderRow}>
                <Ionicons name="person-circle-outline" size={16} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={styles.highestBidder}>by {auctionState.highestBidder}</Text>
              </View>
            )}
          </View>

          {!isAdmin ? (
            <TouchableOpacity style={styles.bidBtn} onPress={placeBid}>
              <LinearGradient 
                colors={['#4f46e5', '#6366f1']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }} 
                style={styles.buttonGradient}
              >
                <Text style={styles.btnText}>PLACE BID (+₹5L)</Text>
                <Ionicons name="caret-up-circle-outline" size={22} color="#fff" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.adminControls}>
              <TouchableOpacity style={styles.sellBtn} onPress={sellPlayer}>
                <LinearGradient 
                  colors={['#10b981', '#34d399']} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 0 }} 
                  style={styles.buttonGradient}
                >
                  <Text style={styles.btnText}>SELL PLAYER</Text>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.nextBtn} onPress={nextPlayer}>
                <Text style={styles.nextBtnText}>SKIP / NEXT PLAYER</Text>
                <Ionicons name="play-skip-forward-outline" size={18} color="#475569" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="hourglass-outline" size={48} color="#94a3b8" style={{ marginBottom: 20 }} />
          <Text style={styles.emptyText}>Waiting for auction to start or no more players available.</Text>
          {isAdmin && (
            <TouchableOpacity style={styles.startBtn} onPress={nextPlayer}>
              <Text style={styles.nextBtnText}>START AUCTION</Text>
              <Ionicons name="play-outline" size={18} color="#475569" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 15,
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
  },
  badge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#4f46e5',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  playerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  playerName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    flex: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  roleText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '800',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  bidSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  currentBidLabel: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
  },
  currentBidAmount: {
    fontSize: 54,
    fontWeight: '900',
    color: '#0f172a',
  },
  bidderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  highestBidder: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  bidBtn: {
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
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  adminControls: {
    gap: 15,
  },
  sellBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  nextBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  startBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  nextBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  }
});
