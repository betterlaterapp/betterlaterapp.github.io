/**
 * Buttons Module
 * Contains all button click handlers for Better Later app
 */

var ButtonsModule = (function() {
    // Private variables
    var json;
    var createNotification;
    var updateActionTable;
    var placeActionIntoLog;
    var shootConfetti;
    var showActiveStatistics;
    var initiateReport;
    var openClickDialog;
    var closeClickDialog;
    var initiateGoalTimer;
    var initiateSmokeTimer;
    var initiateBoughtTimer;
    var adjustFibonacciTimerToBoxes;

    /**
     * Handle crave button click
     * @param {number} timestampSeconds - Current timestamp in seconds
     */
    function handleCraveButtonClick(timestampSeconds) {

        
        // Don't allow clicks more recent than 10 seconds
        if (timestampSeconds - json.statistics.use.lastClickStampCrave > 1) {
            // Return user to stats page
            $(".statistics-tab-toggler").click();

            // Update relevant statistics
            json.statistics.use.craveCounter++;
            $("#crave-total").html(json.statistics.use.craveCounter);
            updateActionTable(timestampSeconds, "craved");

            // Add record into log
            placeActionIntoLog(timestampSeconds, "craved", null, null, null, false);

            var bestStreak = parseInt($('.stat-group.resistStreak .statistic.total').html());
            if (bestStreak == json.statistics.use.cravingsInARow) {
                $('.stat-group.resistStreak .statistic.total').html(bestStreak + 1);
            }

            json.statistics.use.cravingsInARow++;
            $("#cravingsResistedInARow").html(json.statistics.use.cravingsInARow);

            if (json.baseline.decreaseHabit == true) {
                shootConfetti();
            }
            
            showActiveStatistics();

            // Keep lastClickStamp up to date while using app
            json.statistics.use.lastClickStampCrave = timestampSeconds;
    
            initiateReport();
        } else {
            alert("You're awesome.");
        }
    }

    /**
     * Handle use button click
     */
    function handleUseButtonClick() {
        openClickDialog(".use");

        var date = new Date();
        var currHours = date.getHours(),
            currMinutes = date.getMinutes();
        if (currHours >= 12) {
            $(".use.log-more-info .time-picker-am-pm").val("PM");
            currHours = currHours % 12;
        }

        // Set minutes to approx. what time it is
        if (currMinutes >= 45) {
            currMinutes = 45;
        } else if (currMinutes >= 30) {
            currMinutes = 30;
        } else if (currMinutes >= 15) {
            currMinutes = 15;
        } else {
            currMinutes = 0;
        }
        
        $(".use.log-more-info .time-picker-hour").val(currHours);
        $(".use.log-more-info .time-picker-minute").val(currMinutes);

        showActiveStatistics();
    }

    function handleUseButtonDialog() {
        if (json.baseline.decreaseHabit == false) {
            shootConfetti();
        }
        var date = new Date();
        var timestampSeconds = Math.round(date / 1000);

        //get time selection from form
        var requestedTimeStartHours = parseInt($(".use.log-more-info select.time-picker-hour").val());
        var requestedTimeStartMinutes = parseInt($(".use.log-more-info select.time-picker-minute").val());

        var userDidItNow = $("#nowUseRadio").is(':checked');
        if( userDidItNow ) {
            requestedTimeStartHours = date.getHours();
            requestedTimeStartMinutes = date.getMinutes();
        }

        //12 am is actually the first hour in a day... goddamn them.
        if (requestedTimeStartHours == 12) {
            requestedTimeStartHours = 0;
        }
        //account for am vs pm from userfriendly version of time input
        if ($(".use.log-more-info select.time-picker-am-pm").val() == "PM") {
            requestedTimeStartHours = requestedTimeStartHours + 12;
        }

        var requestedTimeDiffSeconds = 0;
            requestedTimeDiffSeconds += date.getHours()*60*60 - requestedTimeStartHours*60*60;
            requestedTimeDiffSeconds += date.getMinutes()*60 - requestedTimeStartMinutes*60;

            //use requested time
            requestedTimestamp = timestampSeconds - requestedTimeDiffSeconds;

        //return to relevant screen
        $(".statistics-tab-toggler").click();

        //fake firstStampUses in json obj
        if (json.statistics.use.clickCounter == 0) {
            json.statistics.use.firstClickStamp = json.statistics.use.firstClickStamp + timestampSeconds;

        } 

        json.statistics.use.clickCounter++;
        $("#use-total").html(json.statistics.use.clickCounter);

        // var currCravingsPerSmokes = Math.round(json.statistics.use.craveCounter / json.statistics.use.clickCounter * 10) / 10;
        // $("#avgDidntPerDid").html(currCravingsPerSmokes);

        json.statistics.use.cravingsInARow = 0;
        $("#cravingsResistedInARow").html(json.statistics.use.cravingsInARow);

        //start timer with optional param for past date
        var userDidItNow = $("#nowUseRadio").is(':checked');
        if (userDidItNow) {
            //update relevant statistics
            updateActionTable(timestampSeconds, "used");
            placeActionIntoLog(timestampSeconds, "used", null, null, null, false);
            initiateSmokeTimer();

        } else {
            //user is selecting time that appears to be in the future
            //will interpret as minus one day
            var secondsToNow = date.getHours()*60*60 + date.getMinutes()*60;
            var secondsToRequested = requestedTimeStartHours*60*60 + requestedTimeStartMinutes*60;

            if( secondsToRequested > secondsToNow) {
                //take one day off
                requestedTimestamp = requestedTimestamp - (1*24*60*60);
            }

            //update relevant statistics
            updateActionTable(requestedTimestamp, "used");
            initiateSmokeTimer(requestedTimestamp);
        }
        
        var newTotals = {
            total: parseInt( $(".statistic.use.totals.total").html() ) + 1,
            week: parseInt( $(".statistic.use.totals.week").html() ) + 1,
            month: parseInt( $(".statistic.use.totals.month").html() ) + 1,
            year: parseInt( $(".statistic.use.totals.year").html() ) + 1,
        }
        $(".statistic.use.totals.total").html(newTotals.total);
        $(".statistic.use.totals.week").html(newTotals.week);
        $(".statistic.use.totals.month").html(newTotals.month);
        $(".statistic.use.totals.year").html(newTotals.year);

        var betweenClicks = {
            total: json.statistics.use.betweenClicks.total,
            week: json.statistics.use.betweenClicks.week,
            month: json.statistics.use.betweenClicks.month,
            year: json.statistics.use.betweenClicks.year 
        }


        $(".statistic.use.timeBetween.total").html(betweenClicks.total);
        $(".statistic.use.timeBetween.week").html(betweenClicks.week);
        $(".statistic.use.timeBetween.month").html(betweenClicks.month);
        $(".statistic.use.timeBetween.year").html(betweenClicks.year);

        //there is an active bought related goal
        if (json.statistics.goal.activeGoalUse !== 0 || json.statistics.goal.activeGoalBoth !== 0) {
            
            
            var message = json.affirmations[Math.floor(Math.random() * json.affirmations.length)]
            if (json.statistics.goal.activeGoalUse !== 0) {
                var goalType = "use";
                
                json.statistics.goal.activeGoalUse = 0;

            } else if (json.statistics.goal.activeGoalBoth !== 0) {
                var goalType = "both";
                
                json.statistics.goal.activeGoalBoth = 0;

            }

            changeGoalStatus(2, goalType, requestedTimestamp);
            createNotification(message);
            clearInterval(goalTimer);

            $("#goal-content .timer-recepticle").hide();
            toggleActiveStatGroups();
            hideInactiveStatistics();

            //place a goal into the goal log
            var startStamp = json.statistics.goal.lastClickStamp;
            var actualEnd = requestedTimestamp;
            placeGoalIntoLog(startStamp, actualEnd, goalType, false);

            //if longest goal just happened longestGoal
            replaceLongestGoal(startStamp, actualEnd)

            //update number of goals
            json.statistics.goal.completedGoals++;
            $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);

        }
        
        initiateReport();

        showActiveStatistics();
        //keep lastClickStamp up to date while using app
        json.statistics.use.lastClickStamp = timestampSeconds;
        closeClickDialog(".use");
        
    }

    /**
     * Handle bought button click
     */
    function handleBoughtButtonClick() {
        openClickDialog(".cost");
    }

    function handleBoughtButtonDialog() {
        var amountSpent = $("#spentInput").val();

        if (!$.isNumeric(amountSpent)) {
            alert("Please enter in a number!");
            return;
        } 

        //return to relevant screen
        $(".statistics-tab-toggler").click();

        var timestampSeconds = Math.round(new Date() / 1000);
        updateActionTable(timestampSeconds, "bought", amountSpent);

        //add record into log
        placeActionIntoLog(timestampSeconds, "bought", amountSpent, null, null, false);

        //fake firstStampBought in json obj
        if (json.statistics.cost.clickCounter == 0) {
            json.statistics.cost.firstClickStamp = json.statistics.cost.firstClickStamp + timestampSeconds;

        } else if (json.statistics.cost.clickCounter == 1) {
            json.statistics.cost.betweenClicks.total = timestampSeconds - json.statistics.cost.firstClickStamp;

        }

        //update display
        json.statistics.cost.clickCounter++;
        $("#bought-total").html(json.statistics.cost.clickCounter);

        //update spent in json
        json.statistics.cost.totals.total = parseInt(json.statistics.cost.totals.total) + parseInt(amountSpent);
        json.statistics.cost.totals.week = parseInt(json.statistics.cost.totals.week) + parseInt(amountSpent);
        json.statistics.cost.totals.month = parseInt(json.statistics.cost.totals.month) + parseInt(amountSpent);
        json.statistics.cost.totals.year = parseInt(json.statistics.cost.totals.year) + parseInt(amountSpent);

        // console.log("json.statistics.cost.totals after submit: ", json.statistics.cost.totals)
        //update display
        $(".statistic.cost.totals.total").html("$" + json.statistics.cost.totals.total);
        $(".statistic.cost.totals.week").html("$" + json.statistics.cost.totals.week );
        $(".statistic.cost.totals.month").html("$" + json.statistics.cost.totals.month );
        $(".statistic.cost.totals.year").html("$" + json.statistics.cost.totals.year );

        closeClickDialog(".cost");
        initiateBoughtTimer();
        showActiveStatistics();
        toggleActiveStatGroups();
        hideInactiveStatistics();
        adjustFibonacciTimerToBoxes("bought-timer");
        var message = json.affirmations[Math.floor(Math.random() * json.affirmations.length)]
        //there is an active bought related goal
        if (json.statistics.goal.activeGoalBought !== 0 || json.statistics.goal.activeGoalBoth !== 0) {
            if (json.statistics.goal.activeGoalBought !== 0) {
                var goalType = "bought";
                json.statistics.goal.activeGoalBought = 0;

            } else if (json.statistics.goal.activeGoalBoth !== 0) {
                var goalType = "both";

                json.statistics.goal.activeGoalBoth = 0;

            }

            changeGoalStatus(2, goalType, timestampSeconds);
            createNotification(message);
            clearInterval(goalTimer);

            $("#goal-content .timer-recepticle").hide();
            toggleActiveStatGroups();
            hideInactiveStatistics();

            //place a goal into the goal log
            var startStamp = json.statistics.goal.lastClickStamp;
            var actualEnd = timestampSeconds;
            placeGoalIntoLog(startStamp, actualEnd, goalType, false);

            //if longest goal just happened
            replaceLongestGoal(startStamp, actualEnd)
            
            //update number of goals
            json.statistics.goal.completedGoals++;
            $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);
            showActiveStatistics();
        }
        //keep lastClickStamp up to date while using app
        json.statistics.cost.lastClickStamp = timestampSeconds;
        
    }
    
    /**
     * Handle goal button click
     */
    function handleGoalButtonClick() {
        openClickDialog(".goal");

        // Setup goal dialog with current time
        GoalsModule.setupGoalDialog();
    }

    /**
     * Setup button click handlers
     */
    function setupButtonHandlers() {
        $("#bought-button, #crave-button, #use-button, #goal-button").click(function() {
            // Detect section
            var timestampSeconds = Math.round(new Date() / 1000);

            if (this.id == "crave-button") {
                handleCraveButtonClick(timestampSeconds);
            } else if (this.id == "use-button") {
                handleUseButtonClick();
            } else if (this.id == "bought-button") {
                handleBoughtButtonClick();
            } else if (this.id == "goal-button") {
                handleGoalButtonClick();
            }
        });

        // Totals should trigger clicks of button
        $("#bought-total").click(function() {
            $("#bought-button").click();
        });
        $("#crave-total").click(function() {
            $("#crave-button").click();
        });
        $("#use-total").click(function() {
            $("#use-button").click();
        });
        $("#goal-total").click(function() {
            $("#goal-button").click();
        });

        //USE DIALOG CLICK
        $(".use.log-more-info button.submit").click(function () {
            handleUseButtonDialog();
        });
        $(".use.log-more-info button.cancel").click(function () {
            closeClickDialog(".use");
        });

        //COST DIALOG CLICK
        $(".cost.log-more-info button.submit").click(function () {
            handleBoughtButtonDialog()

        });

        $(".cost.log-more-info button.cancel").click(function () {
            closeClickDialog(".cost");
        })
        
    }

    /**
     * Initialize the module with required dependencies
     * @param {Object} appJson - The application JSON object
     * @param {Object} dependencies - Object containing required functions
     */
    function init(appJson, dependencies) {
        json = appJson;
        createNotification = dependencies.createNotification;
        updateActionTable = dependencies.updateActionTable;
        placeActionIntoLog = dependencies.placeActionIntoLog;
        shootConfetti = dependencies.shootConfetti;
        showActiveStatistics = dependencies.showActiveStatistics;
        initiateReport = dependencies.initiateReport;
        openClickDialog = dependencies.openClickDialog;
        closeClickDialog = dependencies.closeClickDialog;
        initiateGoalTimer = dependencies.initiateGoalTimer;
        initiateSmokeTimer = dependencies.initiateSmokeTimer;
        initiateBoughtTimer = dependencies.initiateBoughtTimer;
        adjustFibonacciTimerToBoxes = dependencies.adjustFibonacciTimerToBoxes;

        // Setup button handlers
        setupButtonHandlers();
    }

    // Public API
    return {
        handleCraveButtonClick: handleCraveButtonClick,
        handleUseButtonClick: handleUseButtonClick,
        handleUseButtonDialog: handleUseButtonDialog,
        handleBoughtButtonClick: handleBoughtButtonClick,
        handleBoughtButtonDialog: handleBoughtButtonDialog,
        handleGoalButtonClick: handleGoalButtonClick,
        setupButtonHandlers: setupButtonHandlers,
        init: init
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ButtonsModule;
} else {
    window.ButtonsModule = ButtonsModule;
}
