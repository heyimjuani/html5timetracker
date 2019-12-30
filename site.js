/*global $ */
'use strict';

var completedTasks = function() {
  return Object.keys(localStorage).filter(function(key) {
    return key.indexOf("task") === 0;
  }).map(function(key) {
    return JSON.parse(localStorage.getItem(key));
  }).sort(function(a, b) {
    return Date.parse(a.start) - Date.parse(b.start);
  });
};

var formatTask = function(task, format) {
  var start = new Date(task.start);
  var end = new Date(task.end);

  var startHour = ("0" + start.getHours()).slice(-2);
  var startMin = ("0" + start.getMinutes()).slice(-2);
  var endHour = ("0" + end.getHours()).slice(-2);
  var endMin = ("0" + end.getMinutes()).slice(-2);
  var msWorked = (end - start);
  var hoursWorked = Math.floor(msWorked / (1000 * 60 * 60));
  var minsWorked = ("0" + Math.floor(msWorked / (1000 * 60)) % 60).slice(-2);

  if (format === 'tsv') {
    var delim = ': ';
    var descParts = task.description.split(delim);
    var dateString = [
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate(),
    ].join('-');
    return [
      dateString,
      '"' + hoursWorked + ':' + minsWorked + '"',
      descParts[0], // first part of description
      descParts.slice(1).join(delim), // rest of description
    ].join('\t');
  } else {
    // html is default
    return "<li data-task='" + task.id + "'>" + 
      "<h6>" + startHour + ":" + startMin + " - " + endHour + ":" + endMin + "</h6>" + 
      "<br /><p>" + task.description + "<small>" + hoursWorked + ":" + minsWorked + " duration</p></li>";
  }
};

var populateDoneList = function() {
  // clear
  $("#done").html("");
  $("body").removeClass("new list");

  var tasks = completedTasks();

  // check if the user is new
  if (tasks.length) {
    tasks.forEach(function(task) {
      $("#done").prepend(formatTask(task));
    });

    $(".count").text(tasks.length);
    $("body").addClass("list");
  } else {
    $("body").addClass("new");
  }

  $(".count").text(tasks.length);

  var totalMS = tasks.reduce(function(totalMS, task) {
    var start = new Date(task.start);
    var end = new Date(task.end);
    var duration = end - start;
    return totalMS + duration;
  }, 0);

  var totalHHMM = new Date(totalMS).toISOString().substr(11, 5);
  $("#total .value").text(totalHHMM);
}

$(document).ready(function() {

	var myAudio = new Audio("alert.mp3");
	var worked = 0;
  var minToWork;
  var nextCycle;
  var startTime;
  var startHour;
  var startMin;
  if (localStorage.cycle) {
     cycle = localStorage.cycle;
     minToWork = cycle;
  } else {
    minToWork = 30;
    cycle = minToWork;
    nextCycle = cycle;
  }
	
  var cycle;

  var updatePageTitle = function(isRunning) {
    document.title = (isRunning ? 'Ticking' : 'Stopped') + ' | Time tracker';
  }

  var logTime = function() {
      $("body").removeClass("working").addClass("log");
      $("#new").prop("checked", false);
      $("#what").focus();
      updatePageTitle(false);
  }

  var openAlert = function() {
      myAudio.play();
      logTime();
  }

  var startTimer = function() {
    startTime = new Date();
    $("body").removeClass().addClass("working");
    $("#timer span").countdown("option", {
      until: +cycle*60,
      onExpiry: openAlert
    });
    $("#actions span").hide();
    $("#reset").show();
    updatePageTitle(true);
    return false;
  };

  var endTimer = function() {
    worked = $("#timer span").countdown("getTimes");
    $("#timer span").countdown("option", {until: 0, onExpiry: logTime});
    return false;
  };

  var cancel = function() {
    $("#timer span").countdown("option", {until: 0, onExpiry: null});
    
    $("body")
      .removeClass("working log list new")
      .addClass(localStorage.count ? 'list' : 'new');

    updatePageTitle(false);

    return false;
  }

  $("#timer span").countdown({
      until: 0,
      format: "MS",
      compact: true,
      onExpiry: openAlert
  });

  // Get stuff from localStorage
  if (typeof (Storage) !== undefined) {
    populateDoneList();
	}

  // set the cycle length
  $(".set-cycle").on("click", function() {
    $("body").addClass("settings-open");
    $("#cycle").val(localStorage.cycle);
    return false;
  });
  // set the next cycle length
  $(".set-next").on("click", function() {
    $("body").addClass("settings-open");
    $("#nextCycle").val(localStorage.nextCycle);
    return false;
  });
  // only allow numbers to be input into the fields
  $("#cycle").on("input", function (event) { 
      this.value = this.value.replace(/[^0-9]/g, "");
      cycle = $(this).val();
  });
  $("#nextCycle").on("input", function (event) { 
      this.value = this.value.replace(/[^0-9]/g, "");
      nextCycle = $(this).val();
  });
  // do magic when the cycle length form is submitted
  $("#cycle-form").submit(function() {
    if($("#cycle").val() === "") {
      $("#cycle").val("30");
      localStorage.setItem("cycle", 30);
      localStorage.setItem("nextCycle", 30);
    } else {
      localStorage.setItem("cycle", cycle);
      localStorage.setItem("nextCycle", cycle);
    }
    minToWork = localStorage.cycle;
    $("body").removeClass("settings-open");
    return false;
  });
  // close dropdown when clicked anywhere but inside
  $("#settings .overlay").on("click", function() {
    $("body").removeClass("settings-open");
    $("#cycle").val(localStorage.cycle);
    $("#nextCycle").val(localStorage.nextCycle);
  });

  $(".btn-start").on("click", startTimer);
  $("#end").on("click", endTimer);
  $("#cancel, #void").on("click", cancel);

  // do some magic when form is submitted
  $("#logActivity").submit(function() {
    var task = {
      id: "task" + ("0" + localStorage.count).slice(-2),
      description: $("#what").val(),
      start: startTime,
      end: new Date(),
    };

    localStorage.count++;

    myAudio.currentTime = 0;
    myAudio.pause();

    // if these differ, get them to be the same
    if (nextCycle !== cycle) {
      cycle = localStorage.nextCycle;
      localStorage.setItem("cycle", localStorage.nextCycle);
    }

    // add localStorage keys
    localStorage.setItem(task.id, JSON.stringify(task));

    // add new task to the top of the list
    populateDoneList();
  	if ($("#new").is(":checked")) {
  		startTimer();
  	} else {
  		cancel();
  	}

    startTime = new Date();

  	return false;
  });
  $("#done").on("mouseenter", "li[data-task]", function() {
    $(this).find("p").prepend("<span class='delete'>x</span>");
    $(this).find(".delete").on("click", function() {
      var deleteThis = $(this).parent().parent().attr("data-task");
      localStorage.removeItem(deleteThis);
      populateDoneList();
    });
  });
  $("#done").on("mouseleave", "li", function() {
    $(this).find("span.delete").remove();
  });

  $("#copyTSV").on("click", function(e) {
    var tsv = completedTasks().map(function(t) {
      return formatTask(t, 'tsv');
    }).join('\n');

    var textarea = document.createElement('TEXTAREA')
    document.body.appendChild(textarea);
    textarea.value = tsv;
    textarea.select();

    var done = false;
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error(err);
      alert("Could not copy"); 
    }

    document.body.removeChild(textarea);

    e.preventDefault();
  });

  //ask user to confirm clearage
  $("#reset").on("click", function(){
  	$(this).hide();
  	$(this).siblings("span").show();
  	return false;
  });

  //get rid of everything on localStorage
  $("#actions .confirm").on("click", function() {
  	for (var key in localStorage){
      if (key === "nextCycle" || key === "cycle") { continue; }
      localStorage.removeItem(key);
    }
    localStorage.count = 0;
    populateDoneList();
  	$(this).parent().hide();
  	$(this).parent().siblings("#reset").show();
  	return false;
  });

  //cancel clearage of localStorage
  $("#actions .cancel").on("click", function(){
  	$(this).parent().hide();
  	$(this).parent().siblings("#reset").show();
  	return false;
  });

  $(document).keydown(function(e) {
    if(e.which == 13) { // enter
      if ($('body').hasClass('list') || $('body').hasClass('new'))
        return startTimer();
      else if ($('body').hasClass('working'))
        return endTimer();
    } else if (e.which == 27) {
      return cancel();
    }
  });

  //loop alert if browser tab is not active
  $(window).blur(function(){
    myAudio.addEventListener("ended", function() {
      this.currentTime = 0;
      this.play();
    }, false);
  });

  //stop alert when browser tab is active
  $(window).focus(function(){
    myAudio.addEventListener("ended", function() {
      this.currentTime = 0;
      this.pause();
    }, false);
    myAudio.pause();
    myAudio.currentTime = 0;
  });

  updatePageTitle(false);
});
