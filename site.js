/*global $ */
'use strict';

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
  var count = 0;

  var updatePageTitle = function(isRunning) {
    document.title = (isRunning ? 'Ticking' : 'Stopped') + ' | Time tracker';
  }

  var logTime = function() {
      $("body").removeClass("working").addClass("log");
      $("#new").prop("checked", true);
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
    var where;
    if (localStorage.count) {
      $("#timer span").countdown("option", {until: 0, onExpiry: null});
      where = 'list';
    } else {
      $("#timer span").countdown("option", {until: 0, onExpiry: null});
      where = 'new';
    }
    
    $("body")
      .removeClass("working")
      .removeClass("log")
      .addClass(where);

    updatePageTitle(false);

    return false;
  }

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

  var completedTasks = function() {
    return Object.keys(localStorage).filter(function(key) {
      return key.indexOf("task") === 0;
    }).map(function(key) {
      return JSON.parse(localStorage.getItem(key));
    });
  };

  $("#timer span").countdown({
      until: 0,
      format: "MS",
      compact: true,
      onExpiry: openAlert
  });

  // Get stuff from localStorage
  if (typeof (Storage) !== undefined) {
    completedTasks().forEach(function(task) {
      $("#done").prepend(formatTask(task));
    });

    // check if the user is new
    if (localStorage.count) {
      $(".count").text(localStorage.count);
      count = localStorage.count;
      $("body").addClass("list");
    } else {
      $("body").addClass("new");
    }
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
  // magic when the next cycle length form is submitted
  $("#next-form").submit(function() {
    localStorage.setItem("nextCycle", nextCycle);
    nextCycle = localStorage.nextCycle;
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
      id: "task" + ("0" + count).slice(-2),
      description: $("#what").val(),
      start: startTime,
      end: new Date(),
    };

    count++;
    localStorage.count = count;

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
    var listItem = formatTask(task);
  	$("#done").prepend(listItem);
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
      $(this).parent().parent().remove();
      localStorage.removeItem(deleteThis);
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
  	count = 0;
  	$("#done").html("");
  	$("body").removeClass().addClass("new");
  	$(".count").text(count);
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
