function getvoterinfo() {
  
  const scriptProperties = PropertiesService.getScriptProperties();
  const sheet_id = scriptProperties.getProperty('Google_Sheets_ID');
  const sheet = SpreadsheetApp.openById(sheet_id).getSheetByName('voter');
  const proposalsURL = encodeURI(`https://hub.snapshot.org/graphql?query=query{proposals(first:100,skip:0,where:{space_in:["defigeek.eth"],state:"closed"},orderBy:"created",orderDirection:desc){id snapshot}}`);
  const options = { "method": "POST", "muteHttpExceptions": true };
  const proposals = JSON.parse(UrlFetchApp.fetch(proposalsURL, options));
  const output = [];

  for (let i = 0; i < proposals.data.proposals.length; i++) {
    const votesURL = encodeURI(`https://hub.snapshot.org/graphql?query=query{votes(first:1000,skip:0,where:{proposal:"${proposals.data.proposals[i].id}"},orderBy:"created",orderDirection:desc){voter}}`);
    const snapshotjson = JSON.parse(UrlFetchApp.fetch(votesURL, options));
    const keyAPI = scriptProperties.getProperty('CovalentAPI');
    const authheader = { "Authorization": "Basic " + Utilities.base64Encode(keyAPI + ":") };
    const urlCovFTXJP = `https://api.covalenthq.com/v1/eth-mainnet/tokens/0x0028A459D6705B30333E98d5bCb34DD1B21e2A89/token_holders_v2/?block-height=${proposals.data.proposals[i].snapshot}&page-size=1000`;
    const urlCovTXJP = `https://api.covalenthq.com/v1/eth-mainnet/tokens/0x961dD84059505D59f82cE4fb87D3c09bec65301d/token_holders_v2/?block-height=${proposals.data.proposals[i].snapshot}&page-size=1000`;
    const params = { "method": "GET", "headers": authheader };
    const covfTXJPjson = JSON.parse(UrlFetchApp.fetch(urlCovFTXJP, params));
    const covTXJPjson = JSON.parse(UrlFetchApp.fetch(urlCovTXJP, params));

    for (let j = 0; j < snapshotjson.data.votes.length; j++) {
      let balanceTXJP = 0;
      let balancefTXJP = 0;
      let foundTXJP = false;
      let foundfTXJP = false;

      for (let k = 0; k < covTXJPjson.data.items.length; k++) {
        if (snapshotjson.data.votes[j].voter.toLowerCase() == covTXJPjson.data.items[k].address.toLowerCase()) {
          foundTXJP = true;
          if (covTXJPjson.data.items[k].balance !== null) {
            balanceTXJP = parseFloat(covTXJPjson.data.items[k].balance) / 10 ** 8;
          }
          break;
        }
      }
      for (let l = 0; l < covfTXJPjson.data.items.length; l++) {
        if (snapshotjson.data.votes[j].voter.toLowerCase() == covfTXJPjson.data.items[l].address.toLowerCase()) {
          foundfTXJP = true;
          if (covfTXJPjson.data.items[l].balance !== null) {
            balancefTXJP = parseFloat(covfTXJPjson.data.items[l].balance) / 5 / 10 ** 8;
          }
          break;
        }
      }
      if (!foundTXJP) {
        balanceTXJP = 0;
      }
      if (!foundfTXJP) {
        balancefTXJP = 0;
      }
      let txjp = balanceTXJP + balancefTXJP;
      const result = {
        snapshot: proposals.data.proposals[i].snapshot,
        voter: snapshotjson.data.votes[j].voter,
        txjp
      };
      output.push(result);
    }
  }

var startRow = sheet.getLastRow() + 1;
var rowLength = output.length;
var colLength = 3;
var values = output.map(function(result) {
  return [result.snapshot, result.voter, result.txjp];
});
var range = sheet.getRange(startRow, 1, rowLength, colLength);
range.setValues(values);
}

function setProperty() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties({
    'CovalentAPI': "YOURAPIKEY",
    'Google_Sheets_ID': "YOURSHEETID"
  });
}