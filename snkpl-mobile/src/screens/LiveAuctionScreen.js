import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import io from 'socket.io-client';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://snkpl-app-auction.onrender.com';

export default function LiveAuctionScreen({ route, navigation }) {
  const { roomId, isAdmin } = route.params;
  const [socket, setSocket] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [playerToTransfer, setPlayerToTransfer] = useState(null);
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [manualSellPrice, setManualSellPrice] = useState('');
  const [manualSellTeamId, setManualSellTeamId] = useState(null);

  useEffect(() => {
    let newSocket;

    const initConnection = async () => {
      let username = 'Guest_' + Math.floor(Math.random() * 1000);
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData.username) username = userData.username;
        }
      } catch (e) {
        console.log(e);
      }

      newSocket = io(BACKEND_URL);
      setSocket(newSocket);

      newSocket.emit('join_room', { roomId, userId: username, username });

      newSocket.on('room_state', (state) => {
        setAuctionState(state);
        setLoading(false);
      });

      newSocket.on('participants_updated', (users) => {
        setActiveParticipants(users);
      });

    newSocket.on('bid_updated', (data) => {
      setAuctionState(prev => ({
        ...prev,
        currentBid: data.currentBid,
        highestBidder: data.highestBidder
      }));
    });

    newSocket.on('player_sold', (data) => {
      Alert.alert('Sold!', `Player ${data.player.name} sold to ${data.team.name} for ₹${data.player.soldPrice}L`);
      setAuctionState(prev => {
        if (!prev) return prev;
        
        const updatedTeams = prev.teams?.map(t => 
          t._id === data.team._id ? data.team : t
        ) || [];
        
        const updatedPlayers = prev.players?.map(p => 
          p._id === data.player._id ? data.player : p
        ) || [];
        
        return {
          ...prev,
          teams: updatedTeams,
          players: updatedPlayers
        };
      });
    });

      newSocket.on('error', (msg) => {
        Alert.alert('Error', msg);
      });
    };

    initConnection();

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [roomId]);

  const placeBid = () => {
    if (socket) {
      // In a real app, the teamId would be derived from the logged-in user's team
      socket.emit('place_bid', { roomId, teamId: 'TestTeam1' });
    }
  };

  const openSellModal = () => {
    if (!auctionState?.currentPlayer) return;
    setManualSellPrice(auctionState.currentBid?.toString() || auctionState.currentPlayer.basePrice?.toString() || '');
    setManualSellTeamId(auctionState.highestBidderTeamId || null);
    setSellModalVisible(true);
  };

  const confirmSellPlayer = () => {
    if (!manualSellTeamId) {
      Alert.alert('Error', 'Please select a team to sell to.');
      return;
    }
    const amount = parseFloat(manualSellPrice);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Invalid price amount.');
      return;
    }

    if (socket && isAdmin) {
      socket.emit('admin_sell_player', { 
        roomId, 
        playerId: auctionState?.currentPlayer._id, 
        teamId: manualSellTeamId, 
        amount 
      });
      setSellModalVisible(false);
    }
  };

  const removePlayer = (playerId) => {
    Alert.alert('Remove Player', 'Are you sure you want to unsell this player? They will be removed from the team and the team will be refunded.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: () => {
        if (socket && isAdmin) socket.emit('admin_remove_player', { roomId, playerId });
      }, style: 'destructive' }
    ]);
  };

  const openTransferModal = (player) => {
    setPlayerToTransfer(player);
    setTransferModalVisible(true);
  };

  const transferPlayer = (newTeamId) => {
    if (socket && isAdmin && playerToTransfer) {
      socket.emit('admin_transfer_player', { roomId, playerId: playerToTransfer._id, newTeamId });
      setTransferModalVisible(false);
      setPlayerToTransfer(null);
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
        <TouchableOpacity style={styles.badge} onPress={() => setShowTeamsModal(true)}>
          <Text style={styles.badgeText}>DASHBOARD</Text>
        </TouchableOpacity>
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
              <TouchableOpacity style={styles.sellBtn} onPress={openSellModal}>
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

      {/* Teams Dashboard Modal */}
      <Modal
        visible={showTeamsModal}
        animationType="slide"
        onRequestClose={() => setShowTeamsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Room Dashboard</Text>
            <TouchableOpacity onPress={() => setShowTeamsModal(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScroll}>
            {/* ZegoCloud Audio Call Section */}
            <View style={styles.voiceCallSection}>
              <View style={styles.voiceCallHeader}>
                <Ionicons name="call-outline" size={24} color="#10b981" />
                <Text style={styles.voiceCallTitle}>Room Voice Chat</Text>
              </View>
              <Text style={styles.voiceCallDesc}>Join the live audio call to bid with your voice!</Text>
              
              <TouchableOpacity style={styles.joinCallBtn} onPress={() => Alert.alert('Coming Soon', 'ZegoCloud requires setting up Native API Keys and building a Custom Dev Client. Instructions provided in your plan!')}>
                <LinearGradient colors={['#10b981', '#34d399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
                  <Text style={styles.btnText}>JOIN AUDIO CALL</Text>
                  <Ionicons name="mic-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Active Participants */}
            <View style={styles.participantsSection}>
              <Text style={styles.sectionTitle}>Online Participants ({activeParticipants.length})</Text>
              <View style={styles.participantsList}>
                {activeParticipants.map((user, idx) => (
                  <View key={idx} style={styles.participantPill}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.participantName}>{user.username}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Team Standings</Text>
            {auctionState?.teams?.map(team => {
              const teamPlayers = auctionState.players?.filter(p => p.sold && p.teamId === team._id) || [];
              
              return (
                <View key={team._id} style={styles.teamCard}>
                  <View style={styles.teamHeaderRow}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    <View style={styles.purseBadge}>
                      <Text style={styles.purseText}>₹{team.purse}L Left</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.rosterTitle}>Roster ({teamPlayers.length})</Text>
                  {teamPlayers.length > 0 ? (
                    teamPlayers.map(p => (
                      <View key={p._id} style={styles.rosterRow}>
                        <Text style={styles.rosterPlayerName}>{p.name} <Text style={styles.rosterPlayerRole}>({p.role})</Text></Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.rosterPlayerPrice}>₹{p.soldPrice}L</Text>
                          {isAdmin && (
                            <View style={styles.adminActionRow}>
                              <TouchableOpacity onPress={() => openTransferModal(p)} style={styles.actionIconBtn}>
                                <Ionicons name="swap-horizontal" size={18} color="#818CF8" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => removePlayer(p._id)} style={styles.actionIconBtn}>
                                <Ionicons name="close-circle" size={18} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyRosterText}>No players bought yet.</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Transfer Modal */}
      <Modal visible={transferModalVisible} transparent animationType="fade" onRequestClose={() => setTransferModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.transferModal}>
            <Text style={styles.transferTitle}>Transfer {playerToTransfer?.name}</Text>
            <Text style={styles.transferSubtitle}>Select a new team:</Text>
            <ScrollView style={{ maxHeight: 200, width: '100%', marginBottom: 15 }}>
              {auctionState?.teams?.filter(t => t._id !== playerToTransfer?.teamId).map(t => (
                <TouchableOpacity key={t._id} style={styles.transferTeamBtn} onPress={() => transferPlayer(t._id)}>
                  <Text style={styles.transferTeamText}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelTransferBtn} onPress={() => setTransferModalVisible(false)}>
              <Text style={styles.cancelTransferText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Sell Modal */}
      <Modal visible={sellModalVisible} transparent animationType="fade" onRequestClose={() => setSellModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.transferModal}>
            <Text style={styles.transferTitle}>Sell {currentPlayer?.name}</Text>
            <Text style={styles.transferSubtitle}>Final Price (₹ Lakhs):</Text>
            <TextInput
              style={{ width: '100%', textAlign: 'center', marginBottom: 15, backgroundColor: '#0F172A', borderColor: '#334155', borderWidth: 1, borderRadius: 8, padding: 10, color: '#F8FAFC', fontSize: 24, fontWeight: 'bold' }}
              value={manualSellPrice}
              onChangeText={setManualSellPrice}
              keyboardType="number-pad"
            />
            <Text style={styles.transferSubtitle}>Select Winning Team:</Text>
            <ScrollView style={{ maxHeight: 200, width: '100%', marginBottom: 15 }}>
              {auctionState?.teams?.map(t => (
                <TouchableOpacity 
                  key={t._id} 
                  style={[styles.transferTeamBtn, manualSellTeamId === t._id && { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }]} 
                  onPress={() => setManualSellTeamId(t._id)}
                >
                  <Text style={[styles.transferTeamText, manualSellTeamId === t._id && { color: '#10b981' }]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={{ backgroundColor: '#10b981', padding: 16, borderRadius: 8, width: '100%', alignItems: 'center', marginBottom: 10 }}
              onPress={confirmSellPlayer}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>CONFIRM SALE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelTransferBtn} onPress={() => setSellModalVisible(false)}>
              <Text style={styles.cancelTransferText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 15,
    color: '#94A3B8',
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
    color: '#F8FAFC',
  },
  badge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  badgeText: {
    color: '#818CF8',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  playerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#F8FAFC',
    flex: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#312E81',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  roleText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '800',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: '#334155',
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  bidSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  currentBidLabel: {
    fontSize: 12,
    color: '#FCD34D',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
  },
  currentBidAmount: {
    fontSize: 54,
    fontWeight: '900',
    color: '#F59E0B',
    textShadowColor: 'rgba(245, 158, 11, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
  },
  bidderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  highestBidder: {
    fontSize: 14,
    color: '#94A3B8',
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
    backgroundColor: '#334155',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  startBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  nextBtnText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#334155',
    borderRadius: 20,
  },
  modalScroll: {
    padding: 20,
  },
  teamCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  voiceCallSection: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#334155',
  },
  voiceCallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceCallTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginLeft: 8,
  },
  voiceCallDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 15,
  },
  joinCallBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  participantsSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  participantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  participantName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  adminActionRow: {
    flexDirection: 'row',
    marginLeft: 10,
    alignItems: 'center',
  },
  actionIconBtn: {
    marginLeft: 8,
    padding: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transferModal: {
    width: '80%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  transferTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  transferSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 15,
  },
  transferTeamBtn: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    alignItems: 'center',
  },
  transferTeamText: {
    color: '#818CF8',
    fontWeight: 'bold',
    fontSize: 15,
  },
  cancelTransferBtn: {
    marginTop: 10,
  },
  cancelTransferText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  purseBadge: {
    backgroundColor: '#422006',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  purseText: {
    color: '#FCD34D',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rosterTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  rosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  rosterPlayerName: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  rosterPlayerRole: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'normal',
  },
  rosterPlayerPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  emptyRosterText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 5,
  }
});
