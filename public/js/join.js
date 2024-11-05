class LobbyManager {
    constructor() {
        console.log('LobbyManager initialized');
        this.socket = io();
        this.setupEventListeners();
        this.startPeriodicUpdates();
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        
        this.socket.on('connect', () => {
            console.log('Socket connected');
        });

        this.socket.on('availableLobbies', (lobbies) => {
            console.log('Received lobbies:', lobbies);
            this.updateLobbiesList(lobbies);
        });

        this.socket.on('invalidCode', () => {
            console.log('Received invalid code response');
            this.handleInvalidCode();
        });

        this.socket.on('validCode', (data) => {
            console.log('Received valid code response:', data);
            this.handleValidCode(data);
        });

        document.getElementById('code-join-form').addEventListener('submit', (e) => {
            console.log('Form submitted');
            this.handleCodeSubmit(e);
        });
    }

    handleCodeSubmit(e) {
        e.preventDefault();
        const code = document.getElementById('lobby-code').value;
        console.log('Submitting code:', code);
        this.socket.emit('checkLobbyCode', code);
    }
    
    handleInvalidCode() {
        console.log('Received invalid code response');
        alert('Invalid lobby code, please try again');
    }
    
    handleValidCode(data) {
        console.log('Received valid code response:', data);
        this.joinLobby(data.urlId);
    }

    joinLobby(urlId) {
        window.location.href = `/game/lobby/${urlId}`
    }

    startPeriodicUpdates() {
        // Initial Load
        this.socket.emit('requestAvailableLobbies');

        //Set up periodical updates
        setInterval(() => {
            this.socket.emit('requestAvailableLobbies');
        }, 5000);
    }

    updateLobbiesList(lobbies) {
        console.log('updateLobbiesList called with:', lobbies);
        const lobbiesList = document.getElementById('lobbies-list');
        
        if (!lobbies || lobbies.length === 0) {
            console.log('No lobbies found, displaying message');
            lobbiesList.innerHTML = '<p>No available lobbies found</p>';
            return;
        }
    
        const lobbyHtml = lobbies.map(lobby => {
            console.log('Processing lobby:', lobby);
            return `
                <div class="lobby-item">
                    <span class="lobby-name">${lobby.name}</span>
                    <span class="player-count">${lobby.players ? lobby.players.length : 0}/6 Players</span>
                    <button onclick="lobbyManager.joinLobby('${lobby.urlId}')">Join</button>
                </div>
            `;
        }).join('');
    
        console.log('Setting lobby list HTML:', lobbyHtml);
        lobbiesList.innerHTML = lobbyHtml;
    }
}