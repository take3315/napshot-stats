function snapshotquery() {
  const options = { "method": "POST", "muteHttpExceptions": true };
  const proposalsURL = encodeURI(`https://hub.snapshot.org/graphql?query=query{proposals(first:20,skip:0,where:{space_in:["defigeek.eth"],state:"closed"},orderBy:"created",orderDirection:desc){id snapshot scores_total quorum}}`);
  const proposals = JSON.parse(UrlFetchApp.fetch(proposalsURL, options));

  let outputWhale = [];
  let outputActive = [];
  let outputSafe = [];
  let count = 0;
  let maxSnapshot = 0; 

  const voterMap = new Map(); 

  for (let i = 0; i < proposals.data.proposals.length; i++) {
    const proposal = proposals.data.proposals[i];

    if (proposal.scores_total >= proposal.quorum) {
      const proposalId = proposal.id;
      const votesURL = encodeURI(`https://hub.snapshot.org/graphql?query=query{votes(first:1000,skip:0,where:{proposal:"${proposalId}"},orderBy:"created",orderDirection:desc){voter vp}}`);
      const snapshotjson = JSON.parse(UrlFetchApp.fetch(votesURL, options));
      const votes = snapshotjson.data.votes;

      for (let j = 0; j < votes.length; j++) {
        const voter = votes[j].voter;
        const vp = votes[j].vp;

        if (voterMap.has(voter)) {
          const existingEntry = voterMap.get(voter);
          existingEntry.vpSum += vp;
          existingEntry.latestVp = Math.max(existingEntry.latestVp, vp);
          existingEntry.voteCount += 1;
        } else {
          voterMap.set(voter, {
            snapshot: proposal.snapshot,
            vpSum: vp,
            latestVp: vp,
            voteCount: 1
          });
        }
      }

      
      if (proposal.snapshot > maxSnapshot) {
        maxSnapshot = proposal.snapshot;
      }

      count++;
      if (count === 10) {
        break;
      }
    }
  }

  const safeURL = `https://safe-transaction-mainnet.safe.global/api/v1/safes/0x153d9DD730083e53615610A0d2f6F95Ab5A0Bc01/`;
  const safeparam = { "method": "GET" };
  const owner = JSON.parse(UrlFetchApp.fetch(safeURL, safeparam));
  const ownerAddresses = owner.owners;

  for (const [voter, entry] of voterMap.entries()) {
    const voterIndex = ownerAddresses.findIndex(address => address.toLowerCase() === voter.toLowerCase());
    if (voterIndex !== -1) {
      outputSafe.push({
        voter,
        count: entry.voteCount,
        lastvote: entry.snapshot
      });
    }
  }

  
  for (const [voter, entry] of voterMap.entries()) {
    if (entry.vpSum > 1000) {
      if (entry.latestVp > 1000 && entry.voteCount >= 4) {
        outputWhale.push({
          voter,
          txjp: entry.latestVp,
          vpSum: entry.vpSum,
          count: entry.voteCount,
          lastvote: entry.snapshot
        });
      }
      if (entry.voteCount >= 8) {
        outputActive.push({
          voter,
          txjp: entry.latestVp,
          count: entry.voteCount,
          vpSum: entry.vpSum,
          lastvote: entry.snapshot
        });
      }
    }
  }

  outputWhale = outputWhale.filter(entry => {
    return !outputSafe.some(safeEntry => safeEntry.voter === entry.voter);
  });
  outputActive = outputActive.filter(entry => {
    return !outputSafe.some(safeEntry => safeEntry.voter === entry.voter);
  });

  outputSafe.sort((a, b) => b.count - a.count);
  outputWhale.sort((a, b) => b.txjp - a.txjp);
  outputActive.sort((a, b) => b.count - a.count);

  var scriptProperties = PropertiesService.getScriptProperties();
  var webhook = scriptProperties.getProperty('webhook');
  var discordUrl = webhook;

  var outputSafeMessage = 'Multi-sig voters (latest 10 proposals):\n';
  outputSafe.forEach(function (voter) {
    outputSafeMessage += `${voter.voter.toLowerCase()}, count:${voter.count}, lastvote:${voter.lastvote}\n`;
  });

  var outputWhaleMessage = 'Whale voters (exclude Multi-sig & txjp >1000 & count > 4)\n';
  outputWhale.forEach(function (voter) {
    outputWhaleMessage += `${voter.voter.toLowerCase()}, txjp:${voter.txjp.toFixed(2)}, vpSum:${voter.vpSum.toFixed(2)}, count:${voter.count}, lastvote:${voter.lastvote}\n`;
  });

  var outputActiveMessage = 'Active voters (exclude Multi-sig & vpSum >1000 & count > 8):\n';
  outputActive.forEach(function (voter) {
    outputActiveMessage += `${voter.voter.toLowerCase()}, txjp:${voter.txjp.toFixed(2)}, vpSum:${voter.vpSum.toFixed(2)}, count:${voter.count}, lastvote:${voter.lastvote}\n`;
  });

  var output = '```' + '\n' + outputSafeMessage + '\n' + outputWhaleMessage + '\n' + outputActiveMessage + '\n' + '```';

  var params = {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    muteHttpExceptions: true,
  };

  // Send message
  params.payload = JSON.stringify({ content: output });
  var responseSafe = UrlFetchApp.fetch(discordUrl, params);
  Logger.log(responseSafe.getContentText());

}


function setProperty() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties({
    'webhook': 'DISCORD API HOOK'
  });
}