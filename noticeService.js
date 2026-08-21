const noticeClients = new Set();

function addNoticeClient(res) {
  noticeClients.add(res);
}

function removeNoticeClient(res) {
  noticeClients.delete(res);
}

function sendNoticeEvent(notice) {
  const payload =
    `event: notice\n` +
    `data: ${JSON.stringify(notice)}\n\n`;
  
  noticeClients.forEach(res => {
    try {
      res.write(payload);
    } catch (err) {
      removeNoticeClient(res);
      res.end();
    }
  });
}

setInterval(() => {
  noticeClients.forEach(res => {
    try {
      res.write(": ping\n\n");
    } catch (err) {
      removeNoticeClient(res);
      res.end();
    }
  });
}, 25000);

module.exports = {
  addNoticeClient,
  removeNoticeClient,
  sendNoticeEvent
};