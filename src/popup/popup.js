let $switch = document.getElementById('oho-switch');

browser.storage.local.get(['oho-enabled'], function(result) {
  $switch.checked = result['oho-enabled'];
  $switch.parentNode.classList.add('show');
});

$switch.onchange = function() {
  browser.storage.local.set({'oho-enabled': $switch.checked});

  if ($switch.checked) {
    browser.browserAction.setBadgeText({text: 'On'});
    browser.browserAction.setBadgeBackgroundColor({color: '#47F53B'});
  }
  else {
    browser.browserAction.setBadgeText({text: 'Off'});
    browser.browserAction.setBadgeBackgroundColor({color: '#DDDDDD'});
  }
}
