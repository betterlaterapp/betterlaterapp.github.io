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
        }

        // Migration to v2 - Time tracking support
        if (version < 2) {
            console.log("Migrating storage to v2 (time tracking)...");

            // Add activeTimers array for tracking in-progress activity timers
            if (!jsonObject.activeTimers) jsonObject.activeTimers = [];

            // Add customUnits array for user-defined quantity units
            if (!jsonObject.customUnits) jsonObject.customUnits = [];

            // Options updates for time tracking
            if (jsonObject.option && jsonObject.option.liveStatsToDisplay) {
                var live = jsonObject.option.liveStatsToDisplay;
                if (live.timeSpentDoing === undefined) live.timeSpentDoing = true;
                if (live.activeTimer === undefined) live.activeTimer = true;
            }

            // Log items for timed entries
            if (jsonObject.option && jsonObject.option.logItemsToDisplay) {
                var log = jsonObject.option.logItemsToDisplay;
                if (log.timed === undefined) log.timed = true;
            }

            jsonObject.version = 2;
        }

        // Migration to v3 - Rename goal → wait terminology
        if (version < 3) {
            console.log("Migrating storage to v3 (goal→wait rename)...");

            // Rename statistics.goal to statistics.wait
            if (jsonObject.statistics && jsonObject.statistics.goal && !jsonObject.statistics.wait) {
                jsonObject.statistics.wait = JSON.parse(JSON.stringify(jsonObject.statistics.goal));
                
                // Rename internal properties
                var ws = jsonObject.statistics.wait;
                if (ws.activeGoalUse !== undefined) {
                    ws.activeWaitUse = ws.activeGoalUse;
                    delete ws.activeGoalUse;
                }
                if (ws.activeGoalBought !== undefined) {
                    ws.activeWaitBought = ws.activeGoalBought;
                    delete ws.activeGoalBought;
                }
                if (ws.activeGoalBoth !== undefined) {
                    ws.activeWaitBoth = ws.activeGoalBoth;
                    delete ws.activeGoalBoth;
                }
                if (ws.longestGoal !== undefined) {
                    ws.longestWait = ws.longestGoal;
                    delete ws.longestGoal;
                }
                if (ws.completedGoals !== undefined) {
                    ws.completedWaits = ws.completedGoals;
                    delete ws.completedGoals;
                }
            }

            // Update action records: clickType 'goal' → 'wait'
            if (jsonObject.action && Array.isArray(jsonObject.action)) {
                jsonObject.action.forEach(function(action) {
                    if (action.clickType === 'goal') {
                        action.clickType = 'wait';
                        // Keep goalType as waitType but also preserve goalType for backward compat
                        if (action.goalType) {
                            action.waitType = action.goalType;
                        }
                        // Rename timestamps
                        if (action.goalStamp) {
                            action.waitStamp = action.goalStamp;
                        }
                        if (action.goalStopped) {
                            action.waitStopped = action.goalStopped;
                        }
                    }
                });
            }

            // Update option references
            if (jsonObject.option && jsonObject.option.liveStatsToDisplay) {
                var live = jsonObject.option.liveStatsToDisplay;
                if (live.untilGoalEnd !== undefined) {
                    live.untilWaitEnd = live.untilGoalEnd;
                }
                if (live.longestGoal !== undefined) {
                    live.longestWait = live.longestGoal;
                }
            }
            
            // Update logItemsToDisplay: goal → wait
            if (jsonObject.option && jsonObject.option.logItemsToDisplay) {
                var log = jsonObject.option.logItemsToDisplay;
                if (log.goal !== undefined && log.wait === undefined) {
                    log.wait = log.goal;
                }
            }

            jsonObject.version = 3;
        }

        setStorageObject(jsonObject);
        if (version < 3) {
            console.log("Storage migration to v3 complete.");
        }
    }

    /**
     * Checks if the storage object is at the latest version
     * @returns {boolean}
     */
    function isMigrated() {
        if (!hasStorageData()) return true;
        try {
            var jsonObject = JSON.parse(localStorage.esCrave);
            // Check if at latest version (v3)
            return jsonObject && jsonObject.version >= 3;
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

        } else if (ct == "wait" || ct == "goal") {
            var st = 1;
            var waitStopped = -1;
            newRecord = { 
                timestamp: ts.toString(), 
                clickType: ct, 
                clickStamp: now, 
                waitStamp: gs.toString(), 
                waitType: gt, 
                status: st, 
                waitStopped: waitStopped 
            };
            // Add backward compat fields for 'wait' type
            if (ct == "wait") {
                newRecord.goalStamp = gs.toString();
                newRecord.goalType = gt;
                newRecord.goalStopped = waitStopped;
            }

        } else if (ct == "mood") {
            newRecord = { timestamp: ts.toString(), clickType: ct, clickStamp: now, comment: cm, smiley: sm };

        }

        // Only push if newRecord was actually created
        if (newRecord) {
            jsonObject["action"].push(newRecord);
            setStorageObject(jsonObject);
        }
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
            return e && e.clickType == 'goal' && e.goalType == goalType
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
     * Change wait status in storage (renamed from changeGoalStatus)
     * Note: This function handles the storage part. UI updates should be done in app.js
     * @param {number} newWaitStatus - New status value (1=active, 2=partially completed, 3=completed)
     * @param {string} waitType - Type of wait (use, bought, both)
     * @param {number} actualEnd - Optional timestamp when wait actually ended
     * @param {number} waitExtendedTo - Optional new wait end timestamp if extending
     * @returns {object} Updated wait object and whether it was extended
     */
    function changeWaitStatus(newWaitStatus, waitType, actualEnd, waitExtendedTo) {
        // wait status: 1=active, 2=partially completed, 3=completed
        var jsonObject = retrieveStorageObject();

        // Support both old 'goal' clickType and new 'wait' clickType during migration
        var waits = jsonObject.action.filter(function (e) {
            return e && (e.clickType == 'wait' || e.clickType == 'goal') && 
                   (e.waitType == waitType || e.goalType == waitType);
        });
        var mostRecentWait = waits[waits.length - 1];
        mostRecentWait.status = newWaitStatus;

        // actual end was passed to function
        if (actualEnd) {
            mostRecentWait.waitStopped = actualEnd;
            mostRecentWait.goalStopped = actualEnd; // backward compat
        } else {
            // else set the actual end to end of wait endDate
            var endStamp = mostRecentWait.waitStamp || mostRecentWait.goalStamp;
            mostRecentWait.waitStopped = endStamp;
            mostRecentWait.goalStopped = endStamp;
        }

        var wasExtended = false;
        var totalSecondsUntilWaitEnd = null;

        // user wants to extend current wait
        if (waitExtendedTo) {
            var currentEndStamp = mostRecentWait.waitStamp || mostRecentWait.goalStamp;
            if (currentEndStamp < waitExtendedTo) {
                // wait was extended, not shortened
                mostRecentWait.waitStamp = waitExtendedTo;
                mostRecentWait.goalStamp = waitExtendedTo; // backward compat
                setStorageObject(jsonObject);

                var date = new Date();
                var timestampSeconds = Math.round(date / 1000);
                totalSecondsUntilWaitEnd = Math.round(waitExtendedTo - timestampSeconds);
                wasExtended = true;
            }
        } else {
            setStorageObject(jsonObject);
        }

        return {
            wasExtended: wasExtended,
            totalSecondsUntilWaitEnd: totalSecondsUntilWaitEnd,
            waitWasShorter: waitExtendedTo && (mostRecentWait.waitStamp || mostRecentWait.goalStamp) >= waitExtendedTo
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

    /**
     * Create a new 'timed' action record (for time spent tracking)
     * @param {number} ts - timestamp when activity started
     * @param {number} duration - duration in seconds
     * @param {number} amount - optional quantity amount (for "How much" tracking)
     * @param {string} unit - optional unit for the amount (e.g., "laps", "reps", "grams")
     */
    function updateTimedAction(ts, duration, amount, unit) {
        var jsonObject = retrieveStorageObject();
        var now = Math.round(new Date() / 1000);

        var newRecord = {
            timestamp: ts.toString(),
            clickType: "timed",
            clickStamp: now,
            duration: duration
        };

        // Optional amount and unit (for combined time + quantity tracking)
        if (amount !== undefined && amount !== null) {
            newRecord.amount = amount;
        }
        if (unit !== undefined && unit !== null) {
            newRecord.unit = unit;
        }

        jsonObject["action"].push(newRecord);
        setStorageObject(jsonObject);
        return newRecord;
    }

    /**
     * Create a 'used' action with optional amount and unit (for "How much" tracking)
     * @param {number} ts - timestamp
     * @param {number} amount - optional quantity amount
     * @param {string} unit - optional unit for the amount
     */
    function updateUsedActionWithAmount(ts, amount, unit) {
        var jsonObject = retrieveStorageObject();
        var now = Math.round(new Date() / 1000);

        var newRecord = {
            timestamp: ts.toString(),
            clickType: "used",
            clickStamp: now
        };

        if (amount !== undefined && amount !== null) {
            newRecord.amount = amount;
        }
        if (unit !== undefined && unit !== null) {
            newRecord.unit = unit;
        }

        jsonObject["action"].push(newRecord);
        setStorageObject(jsonObject);
        return newRecord;
    }

    /**
     * Start a new activity timer (persists to localStorage)
     * @param {string} timerId - unique ID for the timer
     * @returns {object} The created timer object
     */
    function startActivityTimer(timerId) {
        var jsonObject = retrieveStorageObject();
        if (!jsonObject) return null;
        if (!jsonObject.activeTimers) jsonObject.activeTimers = [];

        var now = Math.round(new Date() / 1000);
        var newTimer = {
            id: timerId || 'timer_' + now,
            startedAt: now,
            pausedAt: null,
            accumulatedSeconds: 0,
            status: 'running' // running, paused, stopped
        };

        jsonObject.activeTimers.push(newTimer);
        setStorageObject(jsonObject);
        return newTimer;
    }

    /**
     * Pause an activity timer
     * @param {string} timerId - ID of the timer to pause
     * @returns {object|null} The updated timer object or null if not found
     */
    function pauseActivityTimer(timerId) {
        var jsonObject = retrieveStorageObject();
        if (!jsonObject || !jsonObject.activeTimers) return null;

        var timer = jsonObject.activeTimers.find(function(t) { return t.id === timerId; });
        if (!timer || timer.status !== 'running') return null;

        var now = Math.round(new Date() / 1000);
        timer.accumulatedSeconds += (now - timer.startedAt);
        timer.pausedAt = now;
        timer.status = 'paused';

        setStorageObject(jsonObject);
        return timer;
    }

    /**
     * Resume a paused activity timer
     * @param {string} timerId - ID of the timer to resume
     * @returns {object|null} The updated timer object or null if not found
     */
    function resumeActivityTimer(timerId) {
        var jsonObject = retrieveStorageObject();
        if (!jsonObject || !jsonObject.activeTimers) return null;

        var timer = jsonObject.activeTimers.find(function(t) { return t.id === timerId; });
        if (!timer || timer.status !== 'paused') return null;

        var now = Math.round(new Date() / 1000);
        timer.startedAt = now;
        timer.pausedAt = null;
        timer.status = 'running';

        setStorageObject(jsonObject);
        return timer;
    }

    /**
     * Stop and remove an activity timer, returning its total duration
     * @param {string} timerId - ID of the timer to stop
     * @returns {object|null} Object with timer details and totalSeconds, or null
     */
    function stopActivityTimer(timerId) {
        var jsonObject = retrieveStorageObject();
        if (!jsonObject || !jsonObject.activeTimers) return null;

        var timerIndex = jsonObject.activeTimers.findIndex(function(t) { return t.id === timerId; });
        if (timerIndex === -1) return null;

        var timer = jsonObject.activeTimers[timerIndex];
        var now = Math.round(new Date() / 1000);
        var totalSeconds = timer.accumulatedSeconds;

        // If running (not paused), add time since last start
        if (timer.status === 'running') {
            totalSeconds += (now - timer.startedAt);
        }

        // Remove timer from active timers
        jsonObject.activeTimers.splice(timerIndex, 1);
        setStorageObject(jsonObject);

        return {
            id: timer.id,
            totalSeconds: totalSeconds,
            originalStartedAt: timer.startedAt - timer.accumulatedSeconds
        };
    }

    /**
     * Get all active timers
     * @returns {Array} Array of active timer objects
     */
    function getActiveTimers() {
        var jsonObject = retrieveStorageObject();
        if (!jsonObject) return [];
        return jsonObject.activeTimers || [];
    }

    /**
     * Get current elapsed time for a timer
     * @param {string} timerId - ID of the timer
     * @returns {number|null} Elapsed seconds or null if not found
     */
    function getTimerElapsedSeconds(timerId) {
        var jsonObject = retrieveStorageObject();
        if (!jsonObject || !jsonObject.activeTimers) return null;

        var timer = jsonObject.activeTimers.find(function(t) { return t.id === timerId; });
        if (!timer) return null;

        var totalSeconds = timer.accumulatedSeconds;
        if (timer.status === 'running') {
            var now = Math.round(new Date() / 1000);
            totalSeconds += (now - timer.startedAt);
        }
        return totalSeconds;
    }

    /**
     * Add a custom unit to the user's list
     * @param {string} unit - The unit to add (e.g., "laps", "reps")
     */
    function addCustomUnit(unit) {
        var jsonObject = retrieveStorageObject();
        if (!jsonObject) return [];
        if (!jsonObject.customUnits) jsonObject.customUnits = [];

        var normalizedUnit = unit.trim().toLowerCase();
        if (normalizedUnit && !jsonObject.customUnits.includes(normalizedUnit)) {
            jsonObject.customUnits.push(normalizedUnit);
            setStorageObject(jsonObject);
        }
        return jsonObject.customUnits;
    }

    /**
     * Get all custom units
     * @returns {Array} Array of custom unit strings
     */
    function getCustomUnits() {
        var jsonObject = retrieveStorageObject();
        if (!jsonObject) return [];
        return jsonObject.customUnits || [];
    }

    // Public API
    return {
        retrieveStorageObject,
        setStorageObject,
        hasStorageData,
        clearStorage,
        updateActionTable,
        changeGoalStatus,
        changeWaitStatus, // New naming
        undoLastAction,
        performOneTimeMigration,
        isMigrated,
        STORAGE_KEY,
        // Time tracking functions
        updateTimedAction,
        updateUsedActionWithAmount,
        startActivityTimer,
        pauseActivityTimer,
        resumeActivityTimer,
        stopActivityTimer,
        getActiveTimers,
        getTimerElapsedSeconds,
        addCustomUnit,
        getCustomUnits
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageModule;
} else {
    window.StorageModule = StorageModule;
}

