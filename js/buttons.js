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

    /**
     * Handle bought button click
     */
    function handleBoughtButtonClick() {
        openClickDialog(".cost");
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
        handleBoughtButtonClick: handleBoughtButtonClick,
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
