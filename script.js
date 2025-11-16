// Global state
let players = [];
let teams = [];
let soldPlayers = [];
let currentPlayerIndex = -1;
// View mode for player list: 'unsold' (default), 'sold', or 'all'
let playerViewMode = 'unsold';

// Constants
const TEAM_BUDGET = 90; // 90 CR
const MIN_SQUAD_SIZE = 16;
const MAX_SQUAD_SIZE = 20;
const MIN_INDIAN_PLAYERS = 6;
const MAX_INDIAN_PLAYERS = 7;
const MIN_FOREIGN_PLAYERS = 8;
const MAX_FOREIGN_PLAYERS = 10;
const MIN_ASSOCIATE_PLAYERS = 2;
const MAX_ASSOCIATE_PLAYERS = 3;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    renderTeams();
    renderPlayers();
    renderTeamDashboard();
});

// Transfer context used when preparing a transfer without immediately unassigning
let transferContext = null; // { playerId, fromTeamId }

// LocalStorage Functions
function saveToLocalStorage() {
    localStorage.setItem('snkpl_players', JSON.stringify(players));
    localStorage.setItem('snkpl_teams', JSON.stringify(teams));
}

function loadFromLocalStorage() {
    const savedPlayers = localStorage.getItem('snkpl_players');
    const savedTeams = localStorage.getItem('snkpl_teams');
    
    if (savedPlayers) {
        players = JSON.parse(savedPlayers);
        // initialize soldPlayers from players array
        soldPlayers = players.filter(p => p.sold);
    }
    
    if (savedTeams) {
        teams = JSON.parse(savedTeams);
    }
    // Normalize assigned types for all teams (ensure associates beyond 3 count as foreign)
    if (teams && teams.length > 0) {
        teams.forEach(t => recalcAssignedTypes(t.id));
    }
}

// Team Management
function addTeam() {
    const teamNameInput = document.getElementById('teamNameInput');
    const teamName = teamNameInput.value.trim();
    
    if (!teamName) {
        alert('Please enter a team name');
        return;
    }
    
    if (teams.find(t => t.name.toLowerCase() === teamName.toLowerCase())) {
        alert('Team already exists');
        return;
    }
    
    const newTeam = {
        id: Date.now().toString(),
        name: teamName,
        purse: TEAM_BUDGET,
        players: [],
        maxPrice: TEAM_BUDGET
    };
    
    teams.push(newTeam);
    teamNameInput.value = '';
    saveToLocalStorage();
    renderTeams();
    renderTeamDashboard();
}

function deleteTeam(teamId) {
    if (confirm('Are you sure you want to delete this team? All players assigned to this team will become unsold.')) {
        const team = teams.find(t => t.id === teamId);
        if (team) {
            // Mark players as unsold
            team.players.forEach(playerId => {
                const player = players.find(p => p.id === playerId);
                if (player) {
                    player.sold = false;
                    player.teamId = null;
                    player.soldPrice = null;
                    player.assignedType = null;
                    // Remove from soldPlayers if present
                    soldPlayers = soldPlayers.filter(p => p.id !== player.id);
                }
            });
        }
        
        teams = teams.filter(t => t.id !== teamId);
        saveToLocalStorage();
        renderTeams();
        renderPlayers();
        renderTeamDashboard();
    }
}

function renderTeams() {
    const teamsList = document.getElementById('teamsList');
    teamsList.innerHTML = '';
    
    teams.forEach(team => {
        const teamBadge = document.createElement('div');
        const teamClass = getTeamClass(team);
        teamBadge.className = `team-badge ${teamClass}`;
        teamBadge.innerHTML = `
            <span>${team.name}</span>
            <span class="purse">${team.purse.toFixed(2)} CR</span>
            <button onclick="deleteTeam('${team.id}')" style="padding: 5px 10px; font-size: 12px; background: rgba(255,255,255,0.3);">×</button>
        `;
        teamsList.appendChild(teamBadge);
    });
}

// Utility: return a normalized team class name like `team-dbs` from a team object
function getTeamClass(team) {
    if (!team || !team.name) return '';
    const slug = team.name.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `team-${slug}`;
}

// File Upload - Supports Multiple Formats
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.') + 1);
    
    const reader = new FileReader();
    
    // Handle different file types
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Excel files
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                
                processPlayerData(jsonData);
                document.getElementById('uploadInfo').innerHTML = `
                    <strong>✓ Success!</strong> ${jsonData.length} players loaded from Excel file.
                    <br><small>Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json), Text (.txt)</small>
                `;
                // Refresh player list after upload
                renderPlayers();
            } catch (error) {
                alert('Error reading Excel file: ' + error.message);
                document.getElementById('uploadInfo').innerHTML = `
                    <strong>✗ Error:</strong> ${error.message}
                    <br><small>Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json), Text (.txt)</small>
                `;
            }
        };
        reader.readAsArrayBuffer(file);
    } else if (fileExtension === 'csv') {
        // CSV files
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const jsonData = parseCSV(text);
                
                processPlayerData(jsonData);
                document.getElementById('uploadInfo').innerHTML = `
                    <strong>✓ Success!</strong> ${jsonData.length} players loaded from CSV file.
                    <br><small>Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json), Text (.txt)</small>
                `;
                // Refresh player list after upload
                renderPlayers();
            } catch (error) {
                alert('Error reading CSV file: ' + error.message);
                document.getElementById('uploadInfo').innerHTML = `
                    <strong>✗ Error:</strong> ${error.message}
                    <br><small>Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json), Text (.txt)</small>
                `;
            }
        };
        reader.readAsText(file);
    } else if (fileExtension === 'json') {
        // JSON files
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const jsonData = JSON.parse(text);
                
                // Handle both array of objects and single object
                const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
                
                processPlayerData(dataArray);
                document.getElementById('uploadInfo').innerHTML = `
                    <strong>✓ Success!</strong> ${dataArray.length} players loaded from JSON file.
                    <br><small>Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json), Text (.txt)</small>
                `;
                // Refresh player list after upload
                renderPlayers();
            } catch (error) {
                alert('Error reading JSON file: ' + error.message);
                document.getElementById('uploadInfo').innerHTML = `
                    <strong>✗ Error:</strong> ${error.message}
                    <br><small>Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json), Text (.txt)</small>
                `;
            }
        };
        reader.readAsText(file);
    } else if (fileExtension === 'txt') {
        // Text files (try to parse as CSV or tab-separated)
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const jsonData = parseTextFile(text);
                
                processPlayerData(jsonData);
                document.getElementById('uploadInfo').innerHTML = `
                    <strong>✓ Success!</strong> ${jsonData.length} players loaded from text file.
                    <br><small>Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json), Text (.txt)</small>
                `;
                // Refresh player list after upload
                renderPlayers();
            } catch (error) {
                alert('Error reading text file: ' + error.message);
                document.getElementById('uploadInfo').innerHTML = `
                    <strong>✗ Error:</strong> ${error.message}
                    <br><small>Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json), Text (.txt)</small>
                `;
            }
        };
        reader.readAsText(file);
    } else {
        alert('Unsupported file format. Please upload Excel (.xlsx, .xls), CSV (.csv), JSON (.json), or Text (.txt) files.');
        document.getElementById('uploadInfo').innerHTML = `
            <strong>✗ Unsupported Format</strong>
            <br><small>Supported formats: Excel (.xlsx, .xls), CSV (.csv), JSON (.json), Text (.txt)</small>
        `;
    }
}

// Parse CSV file
function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Detect delimiter (comma, semicolon, or tab)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';
    
    // Parse header - preserve original case but also create normalized version for lookup
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
        if (values.length === 0 || values.every(v => !v)) continue; // Skip empty rows
        
        const row = {};
        headers.forEach((header, index) => {
            // Preserve original header name
            row[header] = values[index] || '';
        });
        data.push(row);
    }
    
    return data;
}

// Parse text file (try CSV or tab-separated)
function parseTextFile(text) {
    // Try CSV first
    try {
        return parseCSV(text);
    } catch (error) {
        // If CSV fails, try line-by-line parsing
        const lines = text.split('\n').filter(line => line.trim());
        const data = [];
        
        lines.forEach((line, index) => {
            // Try to parse as tab-separated or space-separated
            const parts = line.split(/\t|\s{2,}/).filter(p => p.trim());
            if (parts.length >= 2) {
                data.push({
                    'Name': parts[0] || `Player ${index + 1}`,
                    'Price': parts[1] || '0',
                    'Type': parts[2] || 'Indian',
                    'Role': parts[3] || '',
                    'Country': parts[4] || ''
                });
            }
        });
        
        if (data.length === 0) {
            throw new Error('Could not parse text file. Please ensure it has a valid format (CSV, tab-separated, or space-separated).');
        }
        
        return data;
    }
}

// Helper function to parse price (handles "C" suffix like "5C" = 5 crores)
function parsePrice(priceValue) {
    if (!priceValue) return 0;
    
    // Convert to string and remove whitespace
    let priceStr = priceValue.toString().trim().toUpperCase();
    
    // Remove "C" or "CR" suffix if present
    priceStr = priceStr.replace(/[C|CR|CRORES?]$/i, '').trim();
    
    // Parse as float
    const price = parseFloat(priceStr);
    
    return isNaN(price) ? 0 : price;
}

// Helper function to determine player type from country
function determinePlayerType(country, typeColumn) {
    const countryLower = (country || '').toLowerCase().trim();
    const typeLower = (typeColumn || '').toLowerCase().trim();
    
    // Check if explicitly marked as associate
    if (typeLower.includes('associate')) {
        return 'associate';
    }
    
    // If country is India, it's Indian
    if (countryLower === 'india' || countryLower.includes('india')) {
        return 'indian';
    }
    
    // Foreign teams: Australia, England, New Zealand, South Africa, Pakistan
    const foreignTeams = ['australia', 'england', 'new zealand', 'newzealand', 'south africa', 
                         'southafrica', 'pakistan', 'australian', 'english', 'pakistani'];
    
    if (foreignTeams.some(team => countryLower.includes(team))) {
        return 'foreign';
    }
    
    // If explicitly marked as foreign or overseas
    if (typeLower.includes('foreign') || typeLower.includes('overseas')) {
        return 'foreign';
    }
    
    // All other teams (not India, not the 5 foreign teams) are Associate
    if (countryLower && countryLower !== 'india') {
        return 'associate';
    }
    
    // Default to Indian
    return 'indian';
}

// Return the effective type for counting in squads: if a player was assigned
// an override (e.g., an associate converted to foreign for a team), use that.
function getEffectiveType(player) {
    return (player.assignedType && player.assignedType.trim()) ? player.assignedType : player.type;
}

// Helper function to get value from row with case-insensitive key matching
function getRowValue(row, possibleKeys) {
    // First try exact matches
    for (const key of possibleKeys) {
        if (row.hasOwnProperty(key)) {
            return row[key];
        }
    }
    
    // Then try case-insensitive matches
    const rowKeys = Object.keys(row);
    for (const key of possibleKeys) {
        const foundKey = rowKeys.find(rk => rk.toLowerCase() === key.toLowerCase());
        if (foundKey) {
            return row[foundKey];
        }
    }
    
    return '';
}

function processPlayerData(jsonData) {
    const newPlayers = jsonData.map((row, index) => {
        // Try to identify columns (flexible column mapping with case-insensitive support)
        const name = getRowValue(row, ['Name', 'Player Name', 'Player', 'name', 'player name']) || '';
        const priceValue = getRowValue(row, ['Price', 'Base Price', 'price', 'BasePrice', 'base price']) || 0;
        const price = parsePrice(priceValue);
        const typeColumn = getRowValue(row, ['Type', 'Player Type', 'type', 'Category', 'category']) || '';
        const role = getRowValue(row, ['Role', 'Position', 'role', 'position']) || '';
        const country = getRowValue(row, ['Country', 'country']) || '';
        
        // Determine player type based on country and type column
        const playerType = determinePlayerType(country, typeColumn);
        
        return {
            id: `player_${Date.now()}_${index}`,
            name: name || `Player ${index + 1}`,
            basePrice: price || 0,
            currentPrice: price || 0,
            type: playerType,
            assignedType: null,
            role: role,
            country: country,
            sold: false,
            teamId: null,
            soldPrice: null
        };
    });
    
    // Merge with existing players (avoid duplicates by name)
    newPlayers.forEach(newPlayer => {
        const existingIndex = players.findIndex(p => p.name.toLowerCase() === newPlayer.name.toLowerCase());
        if (existingIndex === -1) {
            players.push(newPlayer);
        } else {
            // Update existing player
            players[existingIndex] = { ...players[existingIndex], ...newPlayer, id: players[existingIndex].id };
        }
    });
    
    saveToLocalStorage();
    renderPlayers();
}

// Player Management
let filteredPlayers = [];

function renderPlayers() {
    filterPlayers();
}

function filterPlayers() {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    
    const searchTerm = (document.getElementById('playerSearchInput')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('playerTypeFilter')?.value || 'all';
    
    // Determine base list based on view mode. Use explicit soldPlayers for sold view.
    let baseList = players;
    if (playerViewMode === 'unsold') baseList = players.filter(p => !p.sold);
    else if (playerViewMode === 'sold') baseList = soldPlayers.slice();
    
    // Apply search filter
    if (searchTerm) {
        baseList = baseList.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            (p.role && p.role.toLowerCase().includes(searchTerm)) ||
            (p.country && p.country.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
        baseList = baseList.filter(p => p.type === typeFilter);
    }

    filteredPlayers = baseList;

    if (baseList.length === 0) {
        const modeMsg = playerViewMode === 'sold' ? 'No sold players found.' : (playerViewMode === 'all' ? 'No players found.' : 'No unsold players found.');
        playerList.innerHTML = `<p style="text-align: center; padding: 20px; color: #666;">${modeMsg} ` + 
            (searchTerm || typeFilter !== 'all' ? 'Try adjusting your filters.' : 'Please upload player list.') + '</p>';
        return;
    }

    baseList.forEach((player, index) => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        // Click behaviour depends on view mode
        if (playerViewMode === 'sold') {
            playerCard.onclick = () => showPlayerModal(player.id);
        } else {
            playerCard.onclick = () => {
                // Find the actual index in the full unsold players list
                const actualIndex = players.filter(p => !p.sold).findIndex(p => p.id === player.id);
                selectPlayer(actualIndex);
            };
        }
        
        playerCard.innerHTML = `
            <h4>${player.name}</h4>
            <div class="price">${player.currentPrice.toFixed(2)} CR</div>
            <div class="type ${player.type}">${player.type.toUpperCase()}</div>
            ${player.role ? `<div style="margin-top: 5px; font-size: 0.9em; color: #666;">${player.role}</div>` : ''}
            ${player.country ? `<div style="margin-top: 3px; font-size: 0.85em; color: #999;">${player.country}</div>` : ''}
            ${player.sold ? `<div style="margin-top: 6px; font-size: 0.95em; color: #444;">Sold to: <strong>${teams.find(t => t.id === player.teamId)?.name || 'Unknown'}</strong> for <strong>${(player.soldPrice || 0).toFixed(2)} CR</strong></div>` : ''}
        `;
        
        playerList.appendChild(playerCard);
    });
}

// Show a modal with player details (used for sold player view)
function showPlayerModal(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    document.getElementById('modalPlayerName').textContent = player.name + (player.sold ? ' - SOLD' : '');
    const modalBody = document.getElementById('modalBody');
    const teamName = player.teamId ? (teams.find(t => t.id === player.teamId)?.name || 'Unknown') : 'Unassigned';
    modalBody.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
            <div><strong>Type:</strong> ${player.type.toUpperCase()}</div>
            <div><strong>Role:</strong> ${player.role || 'N/A'}</div>
            <div><strong>Country:</strong> ${player.country || 'N/A'}</div>
            <div><strong>Base Price:</strong> ${(player.basePrice || 0).toFixed(2)} CR</div>
            <div><strong>Sold Price:</strong> ${(player.soldPrice || 0).toFixed(2)} CR</div>
            <div><strong>Team:</strong> ${teamName}</div>
        </div>
    `;

    document.getElementById('playerModal').style.display = 'block';
}

function selectPlayer(index) {
    const unsoldPlayers = players.filter(p => !p.sold);
    if (index >= 0 && index < unsoldPlayers.length) {
        currentPlayerIndex = players.findIndex(p => p.id === unsoldPlayers[index].id);
        displayCurrentPlayer();
    }
}

function displayCurrentPlayer() {
    const currentPlayerCard = document.getElementById('currentPlayerCard');
    
    if (currentPlayerIndex === -1 || !players[currentPlayerIndex]) {
        currentPlayerCard.innerHTML = '<p class="no-player">No player selected. Click on a player to start auction.</p>';
        return;
    }
    
    const player = players[currentPlayerIndex];
    
    if (player.sold) {
        currentPlayerCard.innerHTML = `
            <div class="player-details">
                <h3>${player.name} - SOLD</h3>
                <p>This player has already been sold to ${teams.find(t => t.id === player.teamId)?.name || 'Unknown'}</p>
            </div>
        `;
        return;
    }
    
    currentPlayerCard.innerHTML = `
        <div class="player-details">
            <h3>${player.name}</h3>
            <div class="player-info">
                <div class="info-item">
                    <label>Base Price</label>
                    <div class="value">${player.basePrice.toFixed(2)} CR</div>
                </div>
                <div class="info-item">
                    <label>Current Price</label>
                    <div class="value">${player.currentPrice.toFixed(2)} CR</div>
                </div>
                <div class="info-item">
                    <label>Type</label>
                    <div class="value">${player.type.toUpperCase()}</div>
                </div>
                ${player.role ? `
                <div class="info-item">
                    <label>Role</label>
                    <div class="value">${player.role}</div>
                </div>
                ` : ''}
            </div>
            <div class="price-input-group">
                <input type="number" id="priceInput" value="${player.currentPrice.toFixed(2)}" step="0.01" min="0" max="${TEAM_BUDGET}">
                <button onclick="updatePlayerPrice()">Update Price</button>
                <button onclick="openTeamSelection()">Sell Player</button>
            </div>
        </div>
    `;
}

function updatePlayerPrice() {
    if (currentPlayerIndex === -1) return;
    
    const priceInput = document.getElementById('priceInput');
    const newPrice = parseFloat(priceInput.value);
    
    if (isNaN(newPrice) || newPrice < 0 || newPrice > TEAM_BUDGET) {
        alert(`Price must be between 0 and ${TEAM_BUDGET} CR`);
        return;
    }
    
    players[currentPlayerIndex].currentPrice = newPrice;
    saveToLocalStorage();
    displayCurrentPlayer();
    renderPlayers();
}

function openTeamSelection() {
    if (currentPlayerIndex === -1) return;
    
    const player = players[currentPlayerIndex];
    const selectedNameEl = document.getElementById('selectedPlayerName');
    if (selectedNameEl) selectedNameEl.textContent = player.name;
    
    const teamSelectionList = document.getElementById('teamSelectionList');
    teamSelectionList.innerHTML = '';
    
    if (teams.length === 0) {
        teamSelectionList.innerHTML = '<p>No teams available. Please add teams first.</p>';
    } else {
        teams.forEach(team => {
            // Determine price to use: if we're preparing a transfer, use soldPrice if available
            const priceToUse = (transferContext && player.soldPrice) ? player.soldPrice : player.currentPrice;
            const canAfford = team.purse >= priceToUse;
            const canAddResult = canAddPlayerToTeam(team.id, player);
            const canAddPlayer = canAddResult.ok;
            
            const teamItem = document.createElement('div');
            const teamClass = getTeamClass(team);
            // When in transfer mode, show all teams and make them selectable (we'll validate on confirm)
            const disabledClass = (!transferContext && (!canAfford || !canAddPlayer)) ? 'disabled' : '';
            teamItem.className = `team-selection-item ${teamClass} ${disabledClass}`;
            
            if (transferContext) {
                teamItem.onclick = () => {
                    // Prevent transferring to same team
                    if (transferContext.fromTeamId === team.id) {
                        alert('Please select a different team to transfer to.');
                        return;
                    }
                    transferToTeam(team.id);
                };
            } else {
                teamItem.onclick = () => {
                    if (!canAfford || !canAddPlayer) return;
                    sellPlayerToTeam(team.id);
                };
            }
            
            let statusMsg = '';
            if (transferContext) {
                statusMsg = 'Click to transfer to this team';
            } else {
                if (!canAfford) statusMsg += '✗ Cannot afford | ';
                if (!canAddPlayer) statusMsg += `✗ ${canAddResult.reason || 'Squad full/invalid'} | `;
                if (canAfford && canAddPlayer) statusMsg += '✓ Ready | ';
            }
            
            // Add minimum squad size warning
            const currentPlayers = team.players.length;
            const needsMore = currentPlayers < MIN_SQUAD_SIZE;
            if (needsMore) {
                statusMsg += `⚠ Needs ${MIN_SQUAD_SIZE - currentPlayers} more players`;
            }
            
            teamItem.innerHTML = `
                <div class="team-name">${team.name}</div>
                <div class="team-info">
                    Purse: ${team.purse.toFixed(2)} CR | 
                    Players: ${team.players.length}/${MIN_SQUAD_SIZE} | 
                    ${statusMsg}
                </div>
            `;
            
            teamSelectionList.appendChild(teamItem);
        });
    }
    
    document.getElementById('teamSelectionModal').style.display = 'block';
}

// Prepare transfer: open team selection WITHOUT unassigning the player yet
function prepareTransferPlayer(playerId, fromTeamId) {
    transferContext = { playerId, fromTeamId };

    const playerIndex = players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
        alert('Player not found for transfer');
        transferContext = null;
        return;
    }

    // Set currentPlayerIndex to the player so openTeamSelection can reuse UI
    currentPlayerIndex = playerIndex;
    // Update modal header to reflect transfer mode
    const modalHeader = document.querySelector('#teamSelectionModal .modal-content h3');
    if (modalHeader) modalHeader.textContent = `Transfer - Select destination for ${players[playerIndex].name}`;
    openTeamSelection();
}

// Execute transfer to target team (keeps player's soldPrice as transfer price)
function transferToTeam(targetTeamId) {
    if (!transferContext) return;

    const { playerId, fromTeamId } = transferContext;
    const player = players.find(p => p.id === playerId);
    const fromTeam = teams.find(t => t.id === fromTeamId);
    const toTeam = teams.find(t => t.id === targetTeamId);

    if (!player || !toTeam) {
        alert('Transfer failed: player or target team not found');
        transferContext = null;
        return;
    }

    if (targetTeamId === fromTeamId) {
        alert('Please select a different team to transfer to.');
        return;
    }

    const transferPrice = parseFloat(player.soldPrice) || parseFloat(player.currentPrice) || 0;

    // Check affordability
    if (toTeam.purse < transferPrice) {
        alert('Target team cannot afford this player at the current price.');
        return;
    }

    // Check squad constraints for target team
    const canAdd = canAddPlayerToTeam(toTeam.id, player);
    if (!canAdd.ok) {
        alert('Cannot transfer player: ' + (canAdd.reason || 'Squad constraints not met'));
        return;
    }

    // Proceed with transfer: refund fromTeam, remove player from fromTeam, assign to toTeam
    if (fromTeam) {
        const refund = parseFloat(player.soldPrice) || 0;
        fromTeam.purse = parseFloat((fromTeam.purse + refund).toFixed(2));
        fromTeam.players = fromTeam.players.filter(pid => pid !== playerId);
    }

    player.teamId = toTeam.id;
    player.sold = true;
    player.soldPrice = transferPrice;
    player.assignedType = null;

    toTeam.players.push(playerId);
    toTeam.purse = parseFloat((toTeam.purse - transferPrice).toFixed(2));
    // Recalculate assignedType for associates in both teams
    if (fromTeam) recalcAssignedTypes(fromTeam.id);
    recalcAssignedTypes(toTeam.id);

    transferContext = null;
    saveToLocalStorage();
    closeTeamModal();
    renderTeams();
    renderPlayers();
    renderTeamDashboard();
    showTeamDetails(toTeam.id);
}

function closeTeamModal() {
    document.getElementById('teamSelectionModal').style.display = 'none';
    transferContext = null;
    // Restore default modal header
    const modalHeader = document.querySelector('#teamSelectionModal .modal-content h3');
    if (modalHeader) modalHeader.innerHTML = 'Select Team for <span id="selectedPlayerName"></span>';
}

function sellPlayerToTeam(teamId) {
    if (currentPlayerIndex === -1) return;
    
    const player = players[currentPlayerIndex];
    const team = teams.find(t => t.id === teamId);
    
    if (!team) return;
    
    if (team.purse < player.currentPrice) {
        alert('Team does not have enough purse');
        return;
    }
    
    const canAdd = canAddPlayerToTeam(teamId, player);
    if (!canAdd.ok) {
        alert('Cannot add player: ' + (canAdd.reason || 'Squad constraints not met'));
        return;
    }
    
    // Handle special rule: if player is an associate and the team already has 3 associates,
    // treat this player as a foreign player for counting purposes.
    const teamPlayersBefore = players.filter(p => p.teamId === teamId);
    const associateCountBefore = teamPlayersBefore.filter(p => getEffectiveType(p) === 'associate').length;
    if (player.type === 'associate' && associateCountBefore >= 3) {
        player.assignedType = 'foreign';
    } else {
        player.assignedType = null;
    }

    // Update player
    player.sold = true;
    player.teamId = teamId;
    player.soldPrice = player.currentPrice;
    // Keep soldPlayers list in sync
    if (!soldPlayers.some(p => p.id === player.id)) soldPlayers.push(player);
    
    // Update team
    team.players.push(player.id);
    team.purse -= player.currentPrice;
    // Recalculate assigned types (associates beyond 3 count as foreign)
    recalcAssignedTypes(teamId);
    
    // Reset current player
    currentPlayerIndex = -1;
    
    saveToLocalStorage();
    closeTeamModal();
    displayCurrentPlayer();
    renderPlayers();
    renderTeams();
    renderTeamDashboard();
    
    // Show congratulations effect
    showCongratulations(player, team);
}

function canAddPlayerToTeam(teamId, player) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return { ok: false, reason: 'Team not found' };

    // Check max squad size
    if (team.players.length >= MAX_SQUAD_SIZE) {
        return { ok: false, reason: `Cannot exceed maximum squad size of ${MAX_SQUAD_SIZE}` };
    }

    // Count current player types in team using effective type
    const teamPlayers = players.filter(p => p.teamId === teamId);
    const indianCount = teamPlayers.filter(p => getEffectiveType(p) === 'indian').length;
    const foreignCount = teamPlayers.filter(p => getEffectiveType(p) === 'foreign').length;
    const associateCount = teamPlayers.filter(p => getEffectiveType(p) === 'associate').length;

    // Preliminary checks for immediate max constraints
    if (player.type === 'indian') {
        if (indianCount >= MAX_INDIAN_PLAYERS) return { ok: false, reason: `Cannot add more Indian players (max ${MAX_INDIAN_PLAYERS})` };
    } else if (player.type === 'foreign') {
        if (foreignCount >= MAX_FOREIGN_PLAYERS) return { ok: false, reason: `Cannot add more Foreign players (max ${MAX_FOREIGN_PLAYERS})` };
    } else if (player.type === 'associate') {
        if (associateCount < 3) {
            // allow
        } else {
            // This associate would be counted as foreign; ensure foreign slot available
            if (foreignCount >= MAX_FOREIGN_PLAYERS) return { ok: false, reason: `Adding this associate would count as foreign but foreign slots are full (max ${MAX_FOREIGN_PLAYERS})` };
        }
    }

    // FEASIBILITY CHECK: ensure it's still possible to reach minimums by the time squad reaches MIN_SQUAD_SIZE
    // Compute counts after hypothetically adding this player
    let indianAfter = indianCount + (player.type === 'indian' ? 1 : 0);
    let foreignAfter = foreignCount + (player.type === 'foreign' ? 1 : 0);
    let associateAfter = associateCount + (player.type === 'associate' ? 1 : 0);

    // Associates beyond 3 count as foreign
    const effectiveAssociateAfter = Math.min(associateAfter, 3);
    const effectiveForeignAfter = foreignAfter + Math.max(0, associateAfter - 3);
    const effectiveIndianAfter = indianAfter;

    // How many slots remain until reaching MIN_SQUAD_SIZE
    const newCount = teamPlayers.length + 1;
    const remainingSlotsUntilMin = Math.max(0, MIN_SQUAD_SIZE - newCount);

    const requiredIndian = Math.max(0, MIN_INDIAN_PLAYERS - effectiveIndianAfter);
    const requiredForeign = Math.max(0, MIN_FOREIGN_PLAYERS - effectiveForeignAfter);
    const requiredAssociate = Math.max(0, MIN_ASSOCIATE_PLAYERS - effectiveAssociateAfter);

    const totalRequired = requiredIndian + requiredForeign + requiredAssociate;

    // NOTE: Previous logic blocked adding a player if after this pick there wouldn't be
    // enough remaining slots to meet minimum squad composition by MIN_SQUAD_SIZE.
    // Per request, that feasibility blocking is removed so picks are allowed even
    // if they make meeting minimums impossible. Keep a console warning for visibility.
    if (totalRequired > remainingSlotsUntilMin) {
        console.warn(`Adding this player may make it impossible to meet minimum squad requirements. Remaining slots: ${remainingSlotsUntilMin}, required: ${totalRequired}`);
        // allow pick to proceed
    }

    return { ok: true };
}

function showAllPlayers() {
    playerViewMode = 'all';
    // reset filters
    if (document.getElementById('playerSearchInput')) document.getElementById('playerSearchInput').value = '';
    if (document.getElementById('playerTypeFilter')) document.getElementById('playerTypeFilter').value = 'all';
    renderPlayers();
}

function showUnsoldPlayers() {
    // Reset filters and show all unsold players
    if (document.getElementById('playerSearchInput')) {
        document.getElementById('playerSearchInput').value = '';
    }
    if (document.getElementById('playerTypeFilter')) {
        document.getElementById('playerTypeFilter').value = 'all';
    }
    playerViewMode = 'unsold';
    renderPlayers();
}

function showSoldPlayers() {
    if (document.getElementById('playerSearchInput')) document.getElementById('playerSearchInput').value = '';
    if (document.getElementById('playerTypeFilter')) document.getElementById('playerTypeFilter').value = 'all';
    playerViewMode = 'sold';
    renderPlayers();
}

function showUnsoldPlayers() {
    if (document.getElementById('playerSearchInput')) document.getElementById('playerSearchInput').value = '';
    if (document.getElementById('playerTypeFilter')) document.getElementById('playerTypeFilter').value = 'all';
    playerViewMode = 'unsold';
    renderPlayers();
}

// Remove all unsold players from the system (useful to clean up)
function removeAllUnsoldPlayers() {
    if (!confirm('Permanently remove all unsold players? This cannot be undone.')) return;

    players = players.filter(p => p.sold);
    saveToLocalStorage();
    renderPlayers();
    renderTeamDashboard();
}

// Remove all players with 0 crores base price
function removeZeroCrorePlayers() {
    const zeroPlayers = players.filter(p => p.basePrice === 0);
    
    if (zeroPlayers.length === 0) {
        alert('No players with 0 crores found.');
        return;
    }
    
    if (!confirm(`Permanently remove ${zeroPlayers.length} player(s) with 0 crores? This cannot be undone.`)) return;

    // Remove from players array
    players = players.filter(p => p.basePrice !== 0);
    
    // Remove from soldPlayers if any
    soldPlayers = soldPlayers.filter(p => p.basePrice !== 0);
    
    saveToLocalStorage();
    renderPlayers();
    renderTeamDashboard();
    alert(`Removed ${zeroPlayers.length} player(s) with 0 crores.`);
}

function randomizePlayers() {
    // Shuffle unsold players
    const unsoldPlayers = players.filter(p => !p.sold);
    const soldPlayers = players.filter(p => p.sold);
    
    // Fisher-Yates shuffle
    for (let i = unsoldPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unsoldPlayers[i], unsoldPlayers[j]] = [unsoldPlayers[j], unsoldPlayers[i]];
    }
    
    // Reconstruct players array maintaining order
    players = [...unsoldPlayers, ...soldPlayers];
    
    saveToLocalStorage();
    renderPlayers();
    currentPlayerIndex = -1;
    displayCurrentPlayer();
}

// Team Dashboard
function renderTeamDashboard() {
    const teamsGrid = document.getElementById('teamsGrid');
    teamsGrid.innerHTML = '';
    
    if (teams.length === 0) {
        teamsGrid.innerHTML = '<p>No teams added yet. Add teams from the admin panel.</p>';
        return;
    }
    
    teams.forEach(team => {
        const teamCard = document.createElement('div');
        const teamClass = getTeamClass(team);
        teamCard.className = `team-card ${teamClass}`;
        
        const teamPlayers = players.filter(p => p.teamId === team.id);
        const indianCount = teamPlayers.filter(p => getEffectiveType(p) === 'indian').length;
        const foreignCount = teamPlayers.filter(p => getEffectiveType(p) === 'foreign').length;
        const associateCount = teamPlayers.filter(p => getEffectiveType(p) === 'associate').length;
        const totalSpent = teamPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
        
        const squadValidation = validateSquad(team);
        
        teamCard.innerHTML = `
            <h3 onclick="showTeamDetails('${team.id}')" style="cursor: pointer; color: #667eea;">${team.name} <span style="font-size: 0.7em; color: #999;">(Click to view details)</span></h3>
            ${teamPlayers.length < MIN_SQUAD_SIZE ? `<div style="background:#fff3cd; color:#856404; padding:8px; border-radius:6px; margin-bottom:10px; font-size:0.9em;"><strong>⚠ Squad Incomplete:</strong> ${MIN_SQUAD_SIZE - teamPlayers.length} more players needed</div>` : ''}
            <div class="purse-display">
                <div class="label">Remaining Purse</div>
                <div class="amount">${team.purse.toFixed(2)} CR</div>
                <div style="font-size: 0.8em; margin-top: 5px; opacity: 0.9;">
                    Initial: ${TEAM_BUDGET.toFixed(2)} CR | Spent: ${totalSpent.toFixed(2)} CR
                </div>
            </div>
            <div class="team-stats">
                <div class="stat-item" onclick="showTeamDetails('${team.id}')" style="cursor: pointer;">
                    <div class="label">Total Players</div>
                    <div class="value">${teamPlayers.length}/${MIN_SQUAD_SIZE}</div>
                </div>
                <div class="stat-item">
                    <div class="label">Total Spent</div>
                    <div class="value">${totalSpent.toFixed(2)} CR</div>
                </div>
                <div class="stat-item">
                    <div class="label">Indian</div>
                    <div class="value">${indianCount}</div>
                </div>
                <div class="stat-item">
                    <div class="label">Foreign</div>
                    <div class="value">${foreignCount}</div>
                </div>
                <div class="stat-item">
                    <div class="label">Associate</div>
                    <div class="value">${associateCount}</div>
                </div>
            </div>
            <div class="squad-validation ${squadValidation.isValid ? 'valid' : 'invalid'}">
                ${squadValidation.message}
            </div>
            <div class="team-players-list">
                <h4 style="margin-bottom: 10px; color: #667eea;">Players (${teamPlayers.length})</h4>
                ${teamPlayers.length === 0 ? '<p>No players yet</p>' : ''}
                ${teamPlayers.slice(0, 5).map(p => `
                    <div class="team-player-item">
                        <span class="player-name">${p.name}</span>
                        <span class="player-price">${(p.soldPrice || 0).toFixed(2)} CR</span>
                    </div>
                `).join('')}
                ${teamPlayers.length > 5 ? `<p style="text-align: center; margin-top: 10px; color: #667eea; cursor: pointer;" onclick="showTeamDetails('${team.id}')">+ ${teamPlayers.length - 5} more players (Click to view all)</p>` : ''}
            </div>
            <button onclick="showTeamDetails('${team.id}')" style="width: 100%; margin-top: 15px;">View Full Team Details</button>
        `;
        
        teamsGrid.appendChild(teamCard);
    });
}

function validateSquad(team) {
    const teamPlayers = players.filter(p => p.teamId === team.id);
    const indianCount = teamPlayers.filter(p => getEffectiveType(p) === 'indian').length;
    const foreignCount = teamPlayers.filter(p => getEffectiveType(p) === 'foreign').length;
    const associateCount = teamPlayers.filter(p => getEffectiveType(p) === 'associate').length;
    const totalPlayers = teamPlayers.length;
    
    const issues = [];
    
    if (totalPlayers < MIN_SQUAD_SIZE) {
        issues.push(`Need at least ${MIN_SQUAD_SIZE} players (currently ${totalPlayers})`);
    }
    if (totalPlayers > MAX_SQUAD_SIZE) {
        issues.push(`Cannot exceed ${MAX_SQUAD_SIZE} players (currently ${totalPlayers})`);
    }
    if (indianCount < MIN_INDIAN_PLAYERS) {
        issues.push(`Need ${MIN_INDIAN_PLAYERS}-${MAX_INDIAN_PLAYERS} Indian players (currently ${indianCount})`);
    }
    if (indianCount > MAX_INDIAN_PLAYERS) {
        issues.push(`Cannot exceed ${MAX_INDIAN_PLAYERS} Indian players (currently ${indianCount})`);
    }
    if (foreignCount < MIN_FOREIGN_PLAYERS) {
        issues.push(`Need ${MIN_FOREIGN_PLAYERS}-${MAX_FOREIGN_PLAYERS} Foreign players (currently ${foreignCount})`);
    }
    if (foreignCount > MAX_FOREIGN_PLAYERS) {
        issues.push(`Cannot exceed ${MAX_FOREIGN_PLAYERS} Foreign players (currently ${foreignCount})`);
    }
    if (associateCount < MIN_ASSOCIATE_PLAYERS) {
        issues.push(`Need ${MIN_ASSOCIATE_PLAYERS} Associate players (currently ${associateCount})`);
    }
    if (associateCount > MAX_ASSOCIATE_PLAYERS) {
        issues.push(`Cannot exceed ${MAX_ASSOCIATE_PLAYERS} Associate players (currently ${associateCount})`);
    }
    
    const isValid = issues.length === 0;
    const message = isValid 
        ? '✓ Squad is valid' 
        : '⚠ Issues: ' + issues.join('; ');
    
    return { isValid, message, issues };
}

// Recalculate assignedType flags for associates in a team.
// Ensures first 3 associates (by team.players order) count as 'associate', others are treated as 'foreign'.
function recalcAssignedTypes(teamId) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    // Iterate team.players in stored order and adjust assignedType for associates
    let associateSeen = 0;
    team.players.forEach(pid => {
        const player = players.find(p => p.id === pid);
        if (!player) return;
        if (player.type === 'associate') {
            associateSeen += 1;
            if (associateSeen > 3) {
                player.assignedType = 'foreign';
            } else {
                // Only clear assignedType if it was previously set to 'foreign'
                if (player.assignedType === 'foreign') player.assignedType = null;
            }
        } else {
            // Non-associate players should not have assignedType set
            if (player.assignedType) player.assignedType = null;
        }
    });
}

// Reports
function generateAllReports() {
    const reportsContainer = document.getElementById('reportsContainer');
    reportsContainer.innerHTML = '';
    
    if (teams.length === 0) {
        reportsContainer.innerHTML = '<p>No teams to generate reports for.</p>';
        return;
    }
    
    teams.forEach(team => {
        const report = generateTeamReport(team);
        reportsContainer.appendChild(report);
    });
}

function generateTeamReport(team) {
    const teamPlayers = players.filter(p => p.teamId === team.id);
    const indianCount = teamPlayers.filter(p => getEffectiveType(p) === 'indian').length;
    const foreignCount = teamPlayers.filter(p => getEffectiveType(p) === 'foreign').length;
    const associateCount = teamPlayers.filter(p => getEffectiveType(p) === 'associate').length;
    const totalSpent = teamPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
    const squadValidation = validateSquad(team);
    
    // Sort players by price (descending)
    const sortedPlayers = [...teamPlayers].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));
    
    const reportCard = document.createElement('div');
    reportCard.className = 'report-card';
    reportCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0;">${team.name} - Report</h3>
            <button onclick="downloadTeamReport('${team.id}')" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Download Report</button>
        </div>
        <div class="report-summary">
            <div class="report-summary-item">
                <div class="label">Remaining Purse</div>
                <div class="value">${team.purse.toFixed(2)} CR</div>
            </div>
            <div class="report-summary-item">
                <div class="label">Total Spent</div>
                <div class="value">${totalSpent.toFixed(2)} CR</div>
            </div>
            <div class="report-summary-item">
                <div class="label">Total Players</div>
                <div class="value">${teamPlayers.length}</div>
            </div>
            <div class="report-summary-item">
                <div class="label">Indian Players</div>
                <div class="value">${indianCount}</div>
            </div>
            <div class="report-summary-item">
                <div class="label">Foreign Players</div>
                <div class="value">${foreignCount}</div>
            </div>
            <div class="report-summary-item">
                <div class="label">Associate Players</div>
                <div class="value">${associateCount}</div>
            </div>
        </div>
        <div class="squad-validation ${squadValidation.isValid ? 'valid' : 'invalid'}" style="margin-bottom: 15px;">
            ${squadValidation.message}
        </div>
        <table class="report-players-table">
            <thead>
                <tr>
                    <th>Player Name</th>
                    <th>Type</th>
                    <th>Role</th>
                    <th>Price (CR)</th>
                </tr>
            </thead>
            <tbody>
                ${sortedPlayers.map(p => `
                    <tr>
                        <td>${p.name}</td>
                        <td>${getEffectiveType(p).toUpperCase()}${p.type === 'associate' && getEffectiveType(p) === 'foreign' ? " <span style='font-size:0.8em; color:#e55353;'>(counted as FOREIGN)</span>" : ''}</td>
                        <td>${p.role || 'N/A'}</td>
                        <td>${(p.soldPrice || 0).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    return reportCard;
}

function downloadTeamReport(teamId) {
    const team = teams.find(t => t.id === teamId);
    if (!team) {
        alert('Team not found.');
        return;
    }
    
    const teamPlayers = players.filter(p => p.teamId === team.id);
    const indianCount = teamPlayers.filter(p => getEffectiveType(p) === 'indian').length;
    const foreignCount = teamPlayers.filter(p => getEffectiveType(p) === 'foreign').length;
    const associateCount = teamPlayers.filter(p => getEffectiveType(p) === 'associate').length;
    const totalSpent = teamPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
    const squadValidation = validateSquad(team);
    
    let csvContent = 'Team Name,Player Name,Type,Role,Price (CR),Remaining Purse,Total Spent,Total Players,Indian,Foreign,Associate,Squad Status\n';
    
    if (teamPlayers.length === 0) {
        csvContent += `${team.name},No Players,,,,${team.purse.toFixed(2)},0,0,0,0,0,${squadValidation.isValid ? 'Valid' : 'Invalid'}\n`;
    } else {
        teamPlayers.forEach((player, index) => {
            const isFirstRow = index === 0;
            csvContent += `${isFirstRow ? team.name : ''},${player.name},${getEffectiveType(player)},${player.role || 'N/A'},${(player.soldPrice || 0).toFixed(2)},${isFirstRow ? team.purse.toFixed(2) : ''},${isFirstRow ? totalSpent.toFixed(2) : ''},${isFirstRow ? teamPlayers.length : ''},${isFirstRow ? indianCount : ''},${isFirstRow ? foreignCount : ''},${isFirstRow ? associateCount : ''},${isFirstRow ? (squadValidation.isValid ? 'Valid' : 'Invalid') : ''}\n`;
        });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `SNKPL_${team.name}_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadAllReports() {
    if (teams.length === 0) {
        alert('No teams to download reports for.');
        return;
    }
    let csvContent = 'Team Name,Player Name,Type,Role,Price (CR),Remaining Purse,Total Spent,Total Players,Indian,Foreign,Associate,Squad Status\n';
    
    teams.forEach(team => {
        const teamPlayers = players.filter(p => p.teamId === team.id);
        const indianCount = teamPlayers.filter(p => getEffectiveType(p) === 'indian').length;
        const foreignCount = teamPlayers.filter(p => getEffectiveType(p) === 'foreign').length;
        const associateCount = teamPlayers.filter(p => getEffectiveType(p) === 'associate').length;
        const totalSpent = teamPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
        const squadValidation = validateSquad(team);
        
        if (teamPlayers.length === 0) {
            csvContent += `${team.name},No Players,,,,${team.purse.toFixed(2)},0,0,0,0,0,${squadValidation.isValid ? 'Valid' : 'Invalid'}\n`;
        } else {
            teamPlayers.forEach((player, index) => {
                const isFirstRow = index === 0;
                csvContent += `${isFirstRow ? team.name : ''},${player.name},${getEffectiveType(player)},${player.role || 'N/A'},${(player.soldPrice || 0).toFixed(2)},${isFirstRow ? team.purse.toFixed(2) : ''},${isFirstRow ? totalSpent.toFixed(2) : ''},${isFirstRow ? teamPlayers.length : ''},${isFirstRow ? indianCount : ''},${isFirstRow ? foreignCount : ''},${isFirstRow ? associateCount : ''},${isFirstRow ? (squadValidation.isValid ? 'Valid' : 'Invalid') : ''}\n`;
            });
        }
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `SNKPL_Auction_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Modal functions
function closePlayerModal() {
    document.getElementById('playerModal').style.display = 'none';
}

// Team Details Modal Functions
function showTeamDetails(teamId) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    const teamPlayers = players.filter(p => p.teamId === team.id);
    const indianCount = teamPlayers.filter(p => getEffectiveType(p) === 'indian').length;
    const foreignCount = teamPlayers.filter(p => getEffectiveType(p) === 'foreign').length;
    const associateCount = teamPlayers.filter(p => getEffectiveType(p) === 'associate').length;
    const totalSpent = teamPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
    const squadValidation = validateSquad(team);
    
    // Sort players by price (descending)
    const sortedPlayers = [...teamPlayers].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));
    
    document.getElementById('teamDetailsName').textContent = `${team.name} - Full Details`;

    const teamDetailsBody = document.getElementById('teamDetailsBody');
    teamDetailsBody.innerHTML = `
        <div class="purse-display" style="margin-bottom: 20px;">
            <div class="label">Remaining Purse</div>
            <div class="amount">${team.purse.toFixed(2)} CR</div>
            <div style="font-size: 0.9em; margin-top: 10px; opacity: 0.9;">
                <div>Initial Budget: ${TEAM_BUDGET.toFixed(2)} CR</div>
                <div>Total Spent: ${totalSpent.toFixed(2)} CR</div>
                <div>Remaining: ${team.purse.toFixed(2)} CR</div>
            </div>
        </div>
        
        <div class="report-summary" style="margin-bottom: 20px;">
            <div class="report-summary-item">
                <div class="label">Total Players</div>
                <div class="value">${teamPlayers.length}</div>
            </div>
            <div class="report-summary-item">
                <div class="label">Indian Players</div>
                <div class="value">${indianCount}</div>
            </div>
            <div class="report-summary-item">
                <div class="label">Foreign Players</div>
                <div class="value">${foreignCount}</div>
            </div>
            <div class="report-summary-item">
                <div class="label">Associate Players</div>
                <div class="value">${associateCount}</div>
            </div>
        </div>
        
        <div class="squad-validation ${squadValidation.isValid ? 'valid' : 'invalid'}" style="margin-bottom: 20px;">
            ${squadValidation.message}
        </div>
        
        <h4 style="color: #667eea; margin-bottom: 15px;">All Players (${teamPlayers.length})</h4>
        <table class="report-players-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Player Name</th>
                    <th>Type</th>
                    <th>Role</th>
                    <th>Price (CR)</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${sortedPlayers.map((p, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${p.name}</td>
                        <td>${getEffectiveType(p).toUpperCase()}</td>
                        <td>${p.role || 'N/A'}</td>
                        <td>${(p.soldPrice || 0).toFixed(2)}</td>
                        <td>
                            <button onclick="removePlayerFromTeam('${p.id}', '${team.id}')" style="margin-right:8px;">Remove</button>
                            <button onclick="prepareTransferPlayer('${p.id}', '${team.id}')" style="margin-right:8px;">Transfer</button>
                            <button onclick="deletePlayer('${p.id}')" style="background:#e55353;">Delete</button>
                        </td>
                    </tr>
                `).join('')}
                ${teamPlayers.length === 0 ? '<tr><td colspan="6" style="text-align: center; padding: 20px;">No players purchased yet</td></tr>' : ''}
            </tbody>
        </table>
    `;
    
    document.getElementById('teamDetailsModal').style.display = 'block';
}

// Remove a player from a team (mark unsold and refund the team's purse)
function removePlayerFromTeam(playerId, teamId) {
    try {
        console.log('removePlayerFromTeam called', { playerId, teamId });
        if (!confirm('Remove this player from the team and mark as unsold?')) return;

        const player = players.find(p => p.id === playerId);
        const team = teams.find(t => t.id === teamId);
        if (!player || !team) {
            console.error('Player or team not found for removePlayerFromTeam', { player, team });
            alert('Error: Player or team not found. See console for details.');
            return;
        }

        // Refund the team's purse with the player's sold price (if any)
        const refund = parseFloat(player.soldPrice) || 0;
        team.purse = parseFloat((team.purse + refund).toFixed(2));

        // Remove player id from team's players array
        team.players = team.players.filter(pid => pid !== playerId);

        // Update player to unsold and clear any assignedType override
        player.sold = false;
        player.teamId = null;
        player.soldPrice = null;
        player.assignedType = null;
        // Remove from soldPlayers if present
        soldPlayers = soldPlayers.filter(p => p.id !== player.id);

        // Recalculate assigned types after removal
        recalcAssignedTypes(teamId);

        saveToLocalStorage();
        renderTeams();
        renderPlayers();
        renderTeamDashboard();
        showTeamDetails(teamId);
    } catch (err) {
        console.error('Error in removePlayerFromTeam', err);
        alert('An unexpected error occurred while removing the player. See console for details.');
    }
}

// Prepare transfer: remove from current team (refund) then open team selection to assign to another team
function transferPlayerToAnotherTeam(playerId, fromTeamId) {
    try {
        console.log('transferPlayerToAnotherTeam called', { playerId, fromTeamId });
        if (!confirm('Transfer this player to another team? This will unassign them from the current team first.')) return;

        const player = players.find(p => p.id === playerId);
        const fromTeam = teams.find(t => t.id === fromTeamId);
        if (!player || !fromTeam) {
            console.error('Player or fromTeam not found for transfer', { player, fromTeam });
            alert('Error: Player or source team not found. See console for details.');
            return;
        }

        // Refund the team's purse with the player's sold price (if any)
        const refund = parseFloat(player.soldPrice) || 0;
        fromTeam.purse = parseFloat((fromTeam.purse + refund).toFixed(2));

        // Remove player id from team's players array
        fromTeam.players = fromTeam.players.filter(pid => pid !== playerId);

        // Update player to unsold and clear any assignedType override
        player.sold = false;
        player.teamId = null;
        player.soldPrice = null;
        player.assignedType = null;
        // Remove from soldPlayers if present
        soldPlayers = soldPlayers.filter(p => p.id !== player.id);

        saveToLocalStorage();
        renderTeams();
        renderPlayers();
        renderTeamDashboard();

        // Set this player as the current player and open selection for reassignment
        currentPlayerIndex = players.findIndex(p => p.id === playerId);
        if (currentPlayerIndex !== -1) {
            openTeamSelection();
        } else {
            console.warn('Could not set currentPlayerIndex for transfer', playerId);
        }
    } catch (err) {
        console.error('Error in transferPlayerToAnotherTeam', err);
        alert('An unexpected error occurred while transferring the player. See console for details.');
    }
}
function deletePlayer(playerId) {
    try {
        console.log('deletePlayer called', playerId);
        if (!confirm('Delete this player permanently? This cannot be undone.')) return;

        const player = players.find(p => p.id === playerId);
        if (!player) {
            console.error('Player not found for deletePlayer', playerId);
            alert('Error: Player not found. See console for details.');
            return;
        }

        // If player was sold, refund their team
        if (player.teamId) {
            const team = teams.find(t => t.id === player.teamId);
            if (team) {
                const refund = parseFloat(player.soldPrice) || 0;
                team.purse = parseFloat((team.purse + refund).toFixed(2));
                team.players = team.players.filter(pid => pid !== playerId);
                // Recalculate assigned types after deletion
                recalcAssignedTypes(team.id);
            }
        }

        // Remove from soldPlayers if present
        soldPlayers = soldPlayers.filter(p => p.id !== playerId);

        // Remove player from players array
        players = players.filter(p => p.id !== playerId);

        saveToLocalStorage();
        renderTeams();
        renderPlayers();
        renderTeamDashboard();
        // Close team details if open
        closeTeamDetailsModal();
    } catch (err) {
        console.error('Error in deletePlayer', err);
        alert('An unexpected error occurred while deleting the player. See console for details.');
    }
}

function closeTeamDetailsModal() {
    document.getElementById('teamDetailsModal').style.display = 'none';
}

// Congratulations Effect Functions
function showCongratulations(player, team) {
    const overlay = document.getElementById('congratulationsOverlay');
    const message = document.getElementById('congratulationsMessage');
    
    message.innerHTML = `
        <strong>${player.name}</strong> has been sold to <strong>${team.name}</strong>!<br>
        <span style="font-size: 1.2em; color: #667eea; font-weight: bold;">${player.soldPrice.toFixed(2)} CR</span>
    `;
    
    overlay.style.display = 'flex';
    
    // Add animation
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
}

function closeCongratulations() {
    const overlay = document.getElementById('congratulationsOverlay');
    overlay.classList.remove('show');
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 500);
}

// Close modals when clicking outside
window.onclick = function(event) {
    const playerModal = document.getElementById('playerModal');
    const teamModal = document.getElementById('teamSelectionModal');
    const teamDetailsModal = document.getElementById('teamDetailsModal');
    const congratulationsOverlay = document.getElementById('congratulationsOverlay');
    
    if (event.target === playerModal) {
        playerModal.style.display = 'none';
    }
    if (event.target === teamModal) {
        teamModal.style.display = 'none';
        transferContext = null;
    }
    if (event.target === teamDetailsModal) {
        teamDetailsModal.style.display = 'none';
    }
    if (event.target === congratulationsOverlay) {
        closeCongratulations();
    }
}
 
