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
    var initiateReport;
    var initiateGoalTimer;
    var initiateSmokeTimer;
    var initiateBoughtTimer;

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
            StorageModule.updateActionTable(timestampSeconds, "craved");

            // Add record into log
            ActionLogModule.placeActionIntoLog(timestampSeconds, "craved", null, null, null, false);

            var bestStreak = parseInt($('.stat-group.resistStreak .statistic.total').html());
            if (bestStreak == json.statistics.use.cravingsInARow) {
                $('.stat-group.resistStreak .statistic.total').html(bestStreak + 1);
            }

            json.statistics.use.cravingsInARow++;
            $("#cravingsResistedInARow").html(json.statistics.use.cravingsInARow);

            if (json.baseline.decreaseHabit == true) {
                UIModule.shootConfetti();
            }
            
            UIModule.showActiveStatistics(json);

            // Keep lastClickStamp up to date while using app
            json.statistics.use.lastClickStampCrave = timestampSeconds;
    
            StatisticsModule.initiateReport(json, StorageModule.retrieveStorageObject, StatisticsModule.createReport);
        } else {
            alert("You're awesome.");
        }
    }

    /**
     * Handle use button click
     */
    function handleUseButtonClick() {
        UIModule.openClickDialog(".use");

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

        UIModule.showActiveStatistics(json, StatisticsModule.recalculateAverageTimeBetween, StatisticsModule.displayLongestGoal);
    }

    /**
     * Calculate requested timestamp from form inputs
     */
    function calculateRequestedTimestamp() {
        var date = new Date();
        var timestampSeconds = Math.round(date / 1000);
        
        var requestedTimeStartHours = parseInt($(".use.log-more-info select.time-picker-hour").val());
        var requestedTimeStartMinutes = parseInt($(".use.log-more-info select.time-picker-minute").val());
        var userDidItNow = $("#nowUseRadio").is(':checked');
        
        if (userDidItNow) {
            requestedTimeStartHours = date.getHours();
            requestedTimeStartMinutes = date.getMinutes();
        }

        // Convert 12-hour to 24-hour format
        if (requestedTimeStartHours == 12) {
            requestedTimeStartHours = 0;
        }
        if ($(".use.log-more-info select.time-picker-am-pm").val() == "PM") {
            requestedTimeStartHours += 12;
        }

        var requestedTimeDiffSeconds = (date.getHours() - requestedTimeStartHours) * 60 * 60 + 
                                      (date.getMinutes() - requestedTimeStartMinutes) * 60;
        var requestedTimestamp = timestampSeconds - requestedTimeDiffSeconds;

        // Handle future times (interpret as previous day)
        if (!userDidItNow) {
            var secondsToNow = date.getHours() * 60 * 60 + date.getMinutes() * 60;
            var secondsToRequested = requestedTimeStartHours * 60 * 60 + requestedTimeStartMinutes * 60;
            
            if (secondsToRequested > secondsToNow) {
                requestedTimestamp -= (24 * 60 * 60); // Subtract one day
            }
        }

        return { timestampSeconds, requestedTimestamp, userDidItNow };
    }

    /**
     * Update statistics display for use actions
     */
    function updateUseStatistics() {
        var newTotals = {
            total: parseInt($(".statistic.use.totals.total").html()) + 1,
            week: parseInt($(".statistic.use.totals.week").html()) + 1,
            month: parseInt($(".statistic.use.totals.month").html()) + 1,
            year: parseInt($(".statistic.use.totals.year").html()) + 1
        };
        
        $(".statistic.use.totals.total").html(newTotals.total);
        $(".statistic.use.totals.week").html(newTotals.week);
        $(".statistic.use.totals.month").html(newTotals.month);
        $(".statistic.use.totals.year").html(newTotals.year);

        var betweenClicks = json.statistics.use.betweenClicks;
        $(".statistic.use.timeBetween.total").html(betweenClicks.total);
        $(".statistic.use.timeBetween.week").html(betweenClicks.week);
        $(".statistic.use.timeBetween.month").html(betweenClicks.month);
        $(".statistic.use.timeBetween.year").html(betweenClicks.year);
    }

    /**
     * Handle goal completion for use actions
     */
    function handleUseGoalCompletion(requestedTimestamp) {
        if (json.statistics.goal.activeGoalUse === 0 && json.statistics.goal.activeGoalBoth === 0) {
            return;
        }

        var goalType = json.statistics.goal.activeGoalUse !== 0 ? "use" : "both";
        var message = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];
        
        // Reset active goal
        json.statistics.goal.activeGoalUse = 0;
        json.statistics.goal.activeGoalBoth = 0;

        changeGoalStatus(2, goalType, requestedTimestamp);
        NotificationsModule.createNotification(message);
        clearInterval(goalTimer);

        $("#goal-content .timer-recepticle").hide();
        toggleActiveStatGroups();
        hideInactiveStatistics();

        // Log completed goal
        var startStamp = json.statistics.goal.lastClickStamp;
        placeGoalIntoLog(startStamp, requestedTimestamp, goalType, false);
        replaceLongestGoal(startStamp, requestedTimestamp);

        // Update goal counter
        json.statistics.goal.completedGoals++;
        $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);
    }

    function handleUseButtonDialog() {
        if (json.baseline.decreaseHabit === false) {
            shootConfetti();
        }

        var timeData = calculateRequestedTimestamp();
        var { timestampSeconds, requestedTimestamp, userDidItNow } = timeData;

        // Return to statistics screen
        $(".statistics-tab-toggler").click();

        // Update click counter
        if (json.statistics.use.clickCounter === 0) {
            json.statistics.use.firstClickStamp += timestampSeconds;
        }
        json.statistics.use.clickCounter++;
        $("#use-total").html(json.statistics.use.clickCounter);

        // Reset cravings streak
        json.statistics.use.cravingsInARow = 0;
        $("#cravingsResistedInARow").html(json.statistics.use.cravingsInARow);

        // Handle action recording and timer
        if (userDidItNow) {
            StorageModule.updateActionTable(timestampSeconds, "used");
            ActionLogModule.placeActionIntoLog(timestampSeconds, "used", null, null, null, false);
            initiateSmokeTimer();
        } else {
            StorageModule.updateActionTable(requestedTimestamp, "used");
            initiateSmokeTimer(requestedTimestamp);
        }

        // Update statistics display
        updateUseStatistics();

        // Handle goal completion
        handleUseGoalCompletion(requestedTimestamp);

        // Final updates
        StatisticsModule.initiateReport(json, StorageModule.retrieveStorageObject, StatisticsModule.createReport);
        UIModule.showActiveStatistics(json, StatisticsModule.recalculateAverageTimeBetween, StatisticsModule.displayLongestGoal);
        json.statistics.use.lastClickStamp = timestampSeconds;
        UIModule.closeClickDialog(".use");
    }

    /**
     * Handle bought button click
     */
    function handleBoughtButtonClick() {
        UIModule.openClickDialog(".cost");
    }

    /**
     * Update cost statistics display
     */
    function updateCostStatistics(amountSpent) {
        // Update totals in JSON
        json.statistics.cost.totals.total = parseInt(json.statistics.cost.totals.total) + parseInt(amountSpent);
        json.statistics.cost.totals.week = parseInt(json.statistics.cost.totals.week) + parseInt(amountSpent);
        json.statistics.cost.totals.month = parseInt(json.statistics.cost.totals.month) + parseInt(amountSpent);
        json.statistics.cost.totals.year = parseInt(json.statistics.cost.totals.year) + parseInt(amountSpent);

        // Update display
        $(".statistic.cost.totals.total").html("$" + json.statistics.cost.totals.total);
        $(".statistic.cost.totals.week").html("$" + json.statistics.cost.totals.week);
        $(".statistic.cost.totals.month").html("$" + json.statistics.cost.totals.month);
        $(".statistic.cost.totals.year").html("$" + json.statistics.cost.totals.year);
    }

    /**
     * Handle goal completion for bought actions
     */
    function handleBoughtGoalCompletion(timestampSeconds) {
        if (json.statistics.goal.activeGoalBought === 0 && json.statistics.goal.activeGoalBoth === 0) {
            return;
        }

        var goalType = json.statistics.goal.activeGoalBought !== 0 ? "bought" : "both";
        var message = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];
        
        // Reset active goal
        json.statistics.goal.activeGoalBought = 0;
        json.statistics.goal.activeGoalBoth = 0;

        changeGoalStatus(2, goalType, timestampSeconds);
        NotificationsModule.createNotification(message);
        clearInterval(goalTimer);

        $("#goal-content .timer-recepticle").hide();
        toggleActiveStatGroups();
        hideInactiveStatistics();

        // Log completed goal
        var startStamp = json.statistics.goal.lastClickStamp;
        placeGoalIntoLog(startStamp, timestampSeconds, goalType, false);
        replaceLongestGoal(startStamp, timestampSeconds);

        // Update goal counter
        json.statistics.goal.completedGoals++;
        $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);
    }

    function handleBoughtButtonDialog() {
        var amountSpent = $("#spentInput").val();

        if (!$.isNumeric(amountSpent)) {
            alert("Please enter in a number!");
            return;
        }

        // Return to statistics screen
        $(".statistics-tab-toggler").click();

        var timestampSeconds = Math.round(new Date() / 1000);
        
        // Record the action
        StorageModule.updateActionTable(timestampSeconds, "bought", amountSpent);
        ActionLogModule.placeActionIntoLog(timestampSeconds, "bought", amountSpent, null, null, false);

        // Update click counter and first click stamp
        if (json.statistics.cost.clickCounter === 0) {
            json.statistics.cost.firstClickStamp += timestampSeconds;
        } else if (json.statistics.cost.clickCounter === 1) {
            json.statistics.cost.betweenClicks.total = timestampSeconds - json.statistics.cost.firstClickStamp;
        }

        json.statistics.cost.clickCounter++;
        $("#bought-total").html(json.statistics.cost.clickCounter);

        // Update cost statistics
        updateCostStatistics(amountSpent);

        // Handle goal completion
        handleBoughtGoalCompletion(timestampSeconds);

        // Final updates
        UIModule.closeClickDialog(".cost");
        initiateBoughtTimer();
        UIModule.showActiveStatistics(json, StatisticsModule.recalculateAverageTimeBetween, StatisticsModule.displayLongestGoal);
        UIModule.toggleActiveStatGroups(json);
        UIModule.hideInactiveStatistics(json);
        UIModule.adjustFibonacciTimerToBoxes("bought-timer", userWasInactive);
        json.statistics.cost.lastClickStamp = timestampSeconds;
    }
    
    /**
     * Handle goal button click
     */
    function handleGoalButtonClick() {
        UIModule.openClickDialog(".goal");

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
        initiateReport = dependencies.initiateReport;
        initiateGoalTimer = dependencies.initiateGoalTimer;
        initiateSmokeTimer = dependencies.initiateSmokeTimer;
        initiateBoughtTimer = dependencies.initiateBoughtTimer;

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
