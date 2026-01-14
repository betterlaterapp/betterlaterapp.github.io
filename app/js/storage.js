var StorageModule = (function () {
    const STORAGE_KEY = 'esCrave';

    /**
     * Migrates the JSON storage object to the latest version
     * This is intended to be called once during app initialization if needed.
     */
    function performOneTimeMigration() {
        if (!hasStorageData()) return;

        var jsonObject = JSON.parse(localStorage.esCrave);
        var version = jsonObject.version || 0;

        // Migration from legacy (v0) to v1
        if (version < 1) {
            console.log("Migrating storage from legacy to v1...");

            // Ensure top-level keys exist
            if (!jsonObject.behavioralGoals) jsonObject.behavioralGoals = [];
            if (!jsonObject.notifications) jsonObject.notifications = [];

            // Baseline updates
            if (jsonObject.baseline) {
                var b = jsonObject.baseline;

                // Convert strings to numbers for counts
                b.amountDonePerWeek = Number(b.amountDonePerWeek) || 0;
                b.goalDonePerWeek = Number(b.goalDonePerWeek) || 0;
                b.amountSpentPerWeek = Number(b.amountSpentPerWeek) || 0;
                b.goalSpentPerWeek = Number(b.goalSpentPerWeek) || 0;

                // Add missing timeline/time fields
                if (b.usageTimeline === undefined) b.usageTimeline = 'week';
                if (b.spendingTimeline === undefined) b.spendingTimeline = 'week';
                if (b.timeTimeline === undefined) b.timeTimeline = 'week';
                if (b.currentTimeHours === undefined) b.currentTimeHours = 0;
                if (b.currentTimeMinutes === undefined) b.currentTimeMinutes = 0;
                if (b.goalTimeHours === undefined) b.goalTimeHours = 0;
                if (b.goalTimeMinutes === undefined) b.goalTimeMinutes = 0;

                // Add valuesTimesDone - default to true if they have usage data or useStats was relevant
                if (b.valuesTimesDone === undefined) {
                    b.valuesTimesDone = (b.amountDonePerWeek > 0 || b.useStatsIrrelevant === false);
                }

                // Remove redundant keys
                delete b.useStatsIrrelevant;
                delete b.costStatsIrrelevant;
                delete b.timeStatsIrrelevant;
            }

            // Options updates
            if (jsonObject.option) {
                var opt = jsonObject.option;

                // Live stats to display
                if (opt.liveStatsToDisplay) {
                    var live = opt.liveStatsToDisplay;
                    if (live.waitButton === undefined) live.waitButton = true;
                    if (live.undoButton === undefined) live.undoButton = true;
                    if (live.moodTracker === undefined) {
                        live.moodTracker = jsonObject.baseline ? !!jsonObject.baseline.valuesHealth : true;
                    }
                    if (live.timesDone === undefined) live.timesDone = true;
                }

                // Log items to display
                if (opt.logItemsToDisplay) {
                    var log = opt.logItemsToDisplay;
                    if (log.bought === undefined) log.bought = true;
                    if (log.mood === undefined) log.mood = true;
                }

                // Report items to display
                if (opt.reportItemsToDisplay) {
                    var rep = opt.reportItemsToDisplay;
                    if (rep.useChangeVsLastWeek === undefined) rep.useChangeVsLastWeek = true;
                    if (rep.costChangeVsLastWeek === undefined) rep.costChangeVsLastWeek = true;
                }
            }

            jsonObject.version = 1;
            setStorageObject(jsonObject);
            console.log("Storage migration to v1 complete.");
        }
    }

    /**
     * Checks if the storage object has a version number
     * @returns {boolean}
     */
    function isMigrated() {
        if (!hasStorageData()) return true;
        try {
            var jsonObject = JSON.parse(localStorage.esCrave);
            return jsonObject && typeof jsonObject.version !== 'undefined';
        } catch (e) {
            return false;
        }
    }

    function retrieveStorageObject(key) {
        if (key) {
            var currJsonString = localStorage[key];
            if (!currJsonString) return null;
            var jsonObject = JSON.parse(currJsonString);
        } else {
            var currJsonString = localStorage.esCrave;
            if (!currJsonString) return null;
            var jsonObject = JSON.parse(currJsonString);
        }
        return jsonObject;
    }

    function setStorageObject(object) {
        var jsonString = JSON.stringify(object);
        localStorage.esCrave = jsonString;
    }

    function hasStorageData() {
        return localStorage.esCrave !== undefined && localStorage.esCrave !== null;
    }

    function clearStorage() {
        window.localStorage.clear();
    }

    /**
     * Create new record of action in storage
     * @param {number} ts - timestamp
     * @param {string} ct - clickType
     * @param {number} spt - spent amount (optional)
     * @param {number} gs - goalStamp (optional)
     * @param {string} gt - goalType (optional)
     * @param {string} cm - comment (optional)
     * @param {number} sm - smiley mood value (optional)
     */
    function updateActionTable(ts, ct, spt, gs, gt, cm, sm) {
        var jsonObject = retrieveStorageObject();

        var newRecord;
        var now = Math.round(new Date() / 1000);

        if (ct == "used" || ct == "craved") {
            newRecord = { timestamp: ts.toString(), clickType: ct, clickStamp: now };

        } else if (ct == "bought") {
            newRecord = { timestamp: ts.toString(), clickType: ct, clickStamp: now, spent: spt.toString() };

        } else if (ct == "goal") {
            var st = 1;
            var goalStopped = -1;
            newRecord = { timestamp: ts.toString(), clickType: ct, clickStamp: now, goalStamp: gs.toString(), goalType: gt, status: st, goalStopped: goalStopped };

        } else if (ct == "mood") {
            newRecord = { timestamp: ts.toString(), clickType: ct, clickStamp: now, comment: cm, smiley: sm };

        }

        jsonObject["action"].push(newRecord);
        setStorageObject(jsonObject);
    }

    /**
     * Change goal status in storage
     * Note: This function handles the storage part. UI updates should be done in app.js
     * @param {number} newGoalStatus - New status value (1=active, 2=partially completed, 3=completed)
     * @param {string} goalType - Type of goal
     * @param {number} actualEnd - Optional timestamp when goal actually ended
     * @param {number} goalExtendedTo - Optional new goal end timestamp if extending
     * @returns {object} Updated goal object and whether it was extended
     */
    function changeGoalStatus(newGoalStatus, goalType, actualEnd, goalExtendedTo) {
        //goal status
        //1 == active goal
        //2 == partially completed goal
        //3 == completed goal

        //convert localStorage to json
        var jsonObject = retrieveStorageObject();

        var goals = jsonObject.action.filter(function (e) {
            return e.clickType == 'goal' && e.goalType == goalType
        });
        var mostRecentGoal = goals[goals.length - 1];
        mostRecentGoal.status = newGoalStatus;

        //actual end was passed to function	
        if (actualEnd) {
            mostRecentGoal.goalStopped = actualEnd;
        } else {
            //else set the actual end to end of goal endDate
            mostRecentGoal.goalStopped = mostRecentGoal.goalStamp;
        }

        var wasExtended = false;
        var totalSecondsUntilGoalEnd = null;

        //user wants to extend current goal
        if (goalExtendedTo) {
            if (mostRecentGoal.goalStamp < goalExtendedTo) {
                //goal was extended, not shortened
                mostRecentGoal.goalStamp = goalExtendedTo;
                setStorageObject(jsonObject);

                var date = new Date();
                var timestampSeconds = Math.round(date / 1000);
                totalSecondsUntilGoalEnd = Math.round(goalExtendedTo - timestampSeconds);
                wasExtended = true;
            }
        } else {
            setStorageObject(jsonObject);
        }

        return {
            wasExtended: wasExtended,
            totalSecondsUntilGoalEnd: totalSecondsUntilGoalEnd,
            goalWasShorter: goalExtendedTo && mostRecentGoal.goalStamp >= goalExtendedTo
        };
    }

    /**
     * Undo the last action in storage
     * Returns the undone action's click type for further processing
     * @returns {string} The clickType of the undone action
     */
    function undoLastAction() {
        var jsonObject = retrieveStorageObject();
        var undoneActionClickType = jsonObject["action"][jsonObject["action"].length - 1].clickType;

        //remove most recent (last) record
        jsonObject["action"].pop();
        setStorageObject(jsonObject);

        return undoneActionClickType;
    }

    // Public API
    return {
        retrieveStorageObject,
        setStorageObject,
        hasStorageData,
        clearStorage,
        updateActionTable,
        changeGoalStatus,
        undoLastAction,
        performOneTimeMigration,
        isMigrated,
        STORAGE_KEY
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageModule;
} else {
    window.StorageModule = StorageModule;
}

