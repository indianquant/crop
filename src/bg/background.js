browser.storage.local.get(['oho-enabled'], function(result) {
  if (result['oho-enabled']) {
    browser.browserAction.setBadgeText({text: 'On'});
    browser.browserAction.setBadgeBackgroundColor({color: '#47F53B'});
  }
  else {
    browser.browserAction.setBadgeText({text: 'Off'});
    browser.browserAction.setBadgeBackgroundColor({color: '#DDDDDD'});
  }
});
