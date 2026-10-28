/* ==========================================================================
   MYBARBERHUB COMMUNITY & RIVALRY CONTROLLER
   Handles channel switching, DMs, chat stream, and leaderboard ranking
   ========================================================================== */

let activeChannelType = 'channel'; // 'channel' or 'dm'
let activeChannelId = 'announcements';

document.addEventListener("DOMContentLoaded", () => {
  initCommunityUI();
  renderCommunity();
});

function initCommunityUI() {
  // Channel buttons
  const channelBtns = document.querySelectorAll(".channel-btn");
  channelBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      activeChannelType = 'channel';
      activeChannelId = e.currentTarget.getAttribute("data-channel");
      
      // Update active styling
      document.querySelectorAll(".channel-btn, .dm-btn").forEach(b => b.classList.remove("active", "btn-active"));
      e.currentTarget.classList.add("active");
      
      renderChatMessages();
    });
  });

  // Send chat button & Enter key
  const btnSend = document.getElementById("btn-send-chat");
  const chatInput = document.getElementById("chat-input");

  if (btnSend && chatInput) {
    btnSend.addEventListener("click", () => sendChatMessage());
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendChatMessage();
    });
  }
}

function renderCommunity() {
  renderLeaderboard();
  renderDMList();
  renderChatMessages();
}

// Render Weekly Rivalry Leaderboard
function renderLeaderboard() {
  const container = document.getElementById("leaderboard-list");
  if (!container) return;

  container.innerHTML = mockData.leaderboard.map(item => `
    <div class="wireframe-card" style="padding: 8px 12px; margin-bottom: 0; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong style="font-size: 12px;">${item.badge} — ${item.name}</strong>
        <p style="font-size: 11px; margin-top: 2px;">Dorm: ${item.dorm}</p>
      </div>
      <span class="hitbox-sm" style="background-color: #111; color: #fff; font-size: 11px;">
        ${item.cuts} Cuts
      </span>
    </div>
  `).join("");
}

// Render DM list in sidebar
function renderDMList() {
  const container = document.getElementById("dm-list");
  if (!container) return;

  container.innerHTML = mockData.directMessages.map(dm => `
    <button class="hitbox dm-btn ${activeChannelType === 'dm' && activeChannelId === dm.barberId ? 'btn-active' : ''}" 
            style="width: 100%; justify-content: flex-start; font-size: 11px;"
            onclick="switchDMChannel('${dm.barberId}')">
      ✉️ DM: ${dm.barberName}
    </button>
  `).join("");
}

// Global switch function for DMs (called from appointments/barbers fast-actions)
window.switchDMChannel = function(barberId) {
  activeChannelType = 'dm';
  activeChannelId = barberId;

  // Ensure barber DM object exists in mockData
  let dmObj = mockData.directMessages.find(d => d.barberId === barberId);
  if (!dmObj) {
    const barber = mockData.barbers.find(b => b.id === barberId);
    const name = barber ? barber.name : "Barber";
    dmObj = {
      barberId: barberId,
      barberName: name,
      messages: []
    };
    mockData.directMessages.push(dmObj);
  }

  // Update UI state
  document.querySelectorAll(".channel-btn, .dm-btn").forEach(b => b.classList.remove("active", "btn-active"));
  renderDMList();
  renderChatMessages();
};

// Render active chat stream
function renderChatMessages() {
  const chatBox = document.getElementById("chat-messages");
  if (!chatBox) return;

  let messages = [];

  if (activeChannelType === 'channel') {
    messages = mockData.channels[activeChannelId] || [];
  } else if (activeChannelType === 'dm') {
    const dmObj = mockData.directMessages.find(d => d.barberId === activeChannelId);
    messages = dmObj ? dmObj.messages : [];
  }

  if (messages.length === 0) {
    chatBox.innerHTML = `<p style="font-size: 11px; color: #666; text-align: center; margin-top: 20px;">[No messages in this chat stream yet]</p>`;
    return;
  }

  chatBox.innerHTML = messages.map(msg => `
    <div class="chat-message">
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <strong style="font-size: 11px;">${msg.sender}</strong>
        <span style="font-size: 10px; color: #666;">${msg.time}</span>
      </div>
      <p style="font-size: 12px;">${msg.text}</p>
    </div>
  `).join("");

  // Auto-scroll to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send chat message
function sendChatMessage() {
  const input = document.getElementById("chat-input");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const senderName = mockData.currentUser.name;

  const newMessage = {
    sender: senderName,
    time: timeStr,
    text: text
  };

  if (activeChannelType === 'channel') {
    if (!mockData.channels[activeChannelId]) {
      mockData.channels[activeChannelId] = [];
    }
    mockData.channels[activeChannelId].push(newMessage);
  } else if (activeChannelType === 'dm') {
    let dmObj = mockData.directMessages.find(d => d.barberId === activeChannelId);
    if (dmObj) {
      dmObj.messages.push(newMessage);
    }
  }

  input.value = "";
  renderChatMessages();
}

// Export render function globally
window.renderCommunity = renderCommunity;