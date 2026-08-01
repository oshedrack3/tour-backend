const clients = new Map();


function addClient(tournamentId, res) {
  
  if (!clients.has(tournamentId)) {
    clients.set(tournamentId, new Set());
  }
  
  clients.get(tournamentId).add(res);
  
}



function removeClient(tournamentId, res) {
  
  const list = clients.get(tournamentId);
  
  if (!list) return;
  
  list.delete(res);
  
  
  if (list.size === 0) {
    clients.delete(tournamentId);
  }
  
}



function sendTournamentUpdate(tournamentId, data) {
  
  const list = clients.get(tournamentId);
  
  if (!list) return;
  
  
  const payload =
    `event: tournament-update\n` +
    `data: ${JSON.stringify(data)}\n\n`;
  
  
  list.forEach(res => {
    
    try {
      
      res.write(payload);
      
    } catch (err) {
      
      removeClient(tournamentId, res);
      
    }
    
  });
  
}

setInterval(() => {
  
  for (const [tournamentId, list] of clients.entries()) {
    
    list.forEach(res => {
      
      try {
        
        res.write(": ping\n\n");
        
      } catch (err) {
        
        removeClient(tournamentId, res);
        res.end();
        
      }
      
    });
    
  }
  
}, 25000);

module.exports = {
  addClient,
  removeClient,
  sendTournamentUpdate
};


