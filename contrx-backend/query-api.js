const http = require('http');

http.get('http://localhost:3001/bancos/contas', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
}).on('error', console.error);
