/* Strenova feature switches. Loaded before every other app script.
   subscription: the Strenova Plus page, its entry points and the Plus paywall.
     Off for now: the plan is to finish it later, so its code stays in place
     (assets/js/18-gt-subscription-page.js, the #subscription section, the
     gt_subscriptions checks) and switching this back to true restores it.
     While it is off, the features that used to sit behind the paywall are
     available to every signed-in user. Server-side checks are unchanged. */
(function () {
  'use strict';
  window.STRENOVA_FEATURES = Object.assign({ subscription: false }, window.STRENOVA_FEATURES || {});
  window.strenovaFeature = function (name) { return window.STRENOVA_FEATURES[name] !== false; };
  document.documentElement.classList.toggle('sx-no-subscription', !window.strenovaFeature('subscription'));
})();
