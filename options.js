// Saves options to chrome.storage
function save_options() {
  var radios = document.getElementsByName("yesorno");

  for (var i = 0, length = radios.length; i < length; i++) {
    if (radios[i].checked) {
      // do whatever you want with the checked radio
      var sort = radios[i].value;

      // only one radio can be logically checked, don't check the rest
      break;
    }
  }
  console.log(sort);
  chrome.storage.sync.set(
    {
      sort: sort
    },
    function() {
      // Update status to let user know options were saved.
      var status = document.getElementById("status");
      status.textContent = "Options saved.";

      setTimeout(function() {
        status.textContent = "";
      }, 750);
    }
  );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get(
    {
      sort: "true"
    },
    function(items) {
      document.getElementById(items.sort).checked = true;
      console.log(items.sort);
    }
  );
}
document.addEventListener("DOMContentLoaded", restore_options);
document.getElementById("save").addEventListener("click", save_options);
