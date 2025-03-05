const socket = io();

function generateTeamCode() {
    const teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    fetch('/teams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: teamCode, socketId: socket.id })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = `/drawing/${data.teamCode}`;
        }
    })
    .catch(error => console.error('Error creating team:', error));
}

function joinTeam(teamCode) {
    fetch('/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: teamCode, socketId: socket.id })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = `/drawing/${data.teamCode}`;
        } else {
            alert('Invalid team code');
        }
    })
    .catch(error => console.error('Error joining team:', error));
}

// Socket event listeners for team updates
socket.on('userJoined', (data) => {
    updateMemberCount(data.memberCount);
});

socket.on('userLeft', (data) => {
    updateMemberCount(data.memberCount);
});

function updateMemberCount(count) {
    const memberCount = document.getElementById('memberCount');
    if (memberCount) {
        memberCount.textContent = `Active Members: ${count}`;
    }
}

document.getElementById('generateTeamCode').addEventListener('click', generateTeamCode);

document.getElementById('joinTeamButton').addEventListener('click', () => {
    const teamCode = document.getElementById('joinTeamCode').value.trim();
    if (teamCode) {
        joinTeam(teamCode);
    }
});