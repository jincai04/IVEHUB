// IVEHUB static config — edit values here
window.IVEHUB_CONFIG = {
  // login (change these before going public)
  creds: { user: 'jincai04', pass: 'Kin@g123' },
  // IVE Token API (the local backend that checks OpenClaw usage)
  tokenApi: 'https://monitoring.genset.com.my/zai-usage-api',
  tokenKey: 'a2d186f57f1fc01ffcb0b4bc1e53d8e34c921cbeab3f7a44',
  // Google Drive sync (optional until set — see README for setup steps)
  google: {
    clientId: '254584038567-73jmgttre30emq6l83lpgttvsu7s8aat.apps.googleusercontent.com'
  },
  apps: {
    mgm: [
      { icon: '📺', name: 'Office TV Dashboard', url: 'http://101.32.243.8:3050/', desc: 'Live ops floor view' },
      { icon: '📊', name: 'CRM Dashboard', url: 'http://101.32.243.8:4001/', desc: 'Pipeline & follow-ups' },
      { icon: '🛰️', name: 'Oversight Module App', url: 'http://101.32.243.8:4000/', desc: 'Genset fleet command' },
      { icon: '🔧', name: 'Customer Oversight Module', url: 'https://monitoring.genset.com.my/', desc: 'Customer-facing monitor' },
      { icon: '📦', name: 'Inventory App', url: 'https://mgm-inventory-app.netlify.app/', desc: 'Stock & parts' },
      { icon: '💰', name: 'Petty Cash App', url: 'https://pettycash.genset.com.my/', desc: 'Vouchers & approvals' },
      { icon: '🌴', name: 'Leave App', url: 'https://mgmleave.genset.com.my/', desc: 'Leave requests & MC' },
      { icon: '🕹️', name: 'Old Dashboard', url: 'https://deft-creponne-5db2c0.netlify.app/', desc: 'Legacy dashboard' }
    ],
    lunar: [
      { icon: '🚢', name: 'Fleet Management', url: 'https://fleet.lunar.com.my/', desc: 'Vessel fleet dashboard' },
      { icon: '🛒', name: 'Purchasing Admin', url: 'https://purchasing.lunar.com.my/admin', desc: 'Purchase orders & approvals' },
      { icon: '📈', name: 'Lunar Dashboard', url: 'http://101.32.243.8:3031/', desc: 'Lunar operations overview' }
    ],
    db: [
      { icon: '📋', name: 'Lead Tracker Dashboard', url: 'https://docs.google.com/spreadsheets/d/1gOa7ahO8j6emUF8dppvVePYhTgv7wjzHO8zQ5vnezes/edit?gid=708855132#gid=708855132', desc: 'Leads pipeline sheet' },
      { icon: '💵', name: 'Petty Cash / Leave', url: 'https://docs.google.com/spreadsheets/d/16mcOW7MDfIW4DPGyKj1B9OB9ezvHdGhlTp1GOsBXlrg/edit?gid=365126685#gid=365126685', desc: 'Petty cash & leave records' },
      { icon: '📮', name: 'WA & Email Database', url: 'https://docs.google.com/spreadsheets/d/161JDSHbUCmtv8c1MB9WY0pOVfXD9_9vawkqnl5IBido/edit?pli=1&gid=214944863#gid=214944863', desc: 'WhatsApp & email contacts' },
      { icon: '🗄️', name: 'NocoDB MGM', url: 'https://mgmgenerator.com/nocodb/dashboard/#/default/pu7hatrkbloa642/m88mc46pwzmq5o5/vwdgiudw8hsvf6c3/genset-service-tracking', desc: 'Genset service tracking' },
      { icon: '🔗', name: 'OLD genset api', url: 'https://gensetapi.genset.com.my/api/genset-list', desc: 'Legacy genset feed' }
    ],
    modu: [
      { icon: '📱', name: 'gmpmobile app', url: 'https://gmpmobile.netlify.app/', desc: 'GMP mobile app' },
      { icon: '🌐', name: 'tbsn app', url: 'https://tbsn.netlify.app/', desc: 'TBSN app' },
      { icon: '🌸', name: 'women app', url: 'https://womenempowermentapp.netlify.app/', desc: 'Women empowerment app' },
      { icon: '📊', name: 'sanyog dashboard', url: 'https://adminhrdashboard.netlify.app/', desc: 'Sanyog HR dashboard' }
      // add more MODU apps here, e.g. { icon: '🧩', name: 'My Module', url: 'https://...', desc: 'What it does' }
    ]
  }
};
