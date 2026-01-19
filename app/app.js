/****************************************************************************


Copyright (c) 2026 Corey Boiko

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*********************************************************************************/
var welcomeHome;

$(document).ready(function () {
    //CLIENT CAN USE STORAGE SYSTEM - html5
    if (typeof (Storage) !== "undefined") {
        // Run migration if explicitly requested via update button OR if data is legacy (v0)
        // This ensures users who update to this version of the code get the structural updates "out of the box"
        if (localStorage.getItem('betterLaterPendingMigration') === 'true' || !StorageModule.isMigrated()) {
            StorageModule.performOneTimeMigration();
            localStorage.removeItem('betterLaterPendingMigration');
        }

        // Initialize user activity tracking variable early
        var userWasInactive = false;

        //local working data to use in app
        var json = {
            "statistics": {
                "cost": {
                    "sinceTimerStart": {
                        "totalSeconds": 0,
                        "days": 0,
                        "hours": 0,
                        "minutes": 0,
                        "seconds": 0
                    },
                    "clickCounter": 0,
                    "totals": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0
                    },
                    "firstClickStamp": 0,
                    "lastClickStamp": 0,
                    "betweenClicks": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0
                    },
                },
                "use": {
                    "sinceTimerStart": {
                        "totalSeconds": 0,
                        "days": 0,
                        "hours": 0,
                        "minutes": 0,
                        "seconds": 0
                    },
                    "betweenClicks": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0

                    },
                    "clickCounter": 0,
                    "craveCounter": 0,
                    "cravingsInARow": 0,
                    "firstClickStamp": 0,
                    "lastClickStamp": 0,
                    "lastClickStampCrave": 0,
                    "didntPerDid": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0
                    },
                    "resistStreak": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0
                    }

                },
                "wait": {
                    "untilTimerEnd": {
                        "totalSeconds": 0,
                        "days": 0,
                        "hours": 0,
                        "minutes": 0,
                        "seconds": 0
                    },
                    "clickCounter": 0,
                    "lastClickStamp": 0,
                    "longestWait": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0
                    },
                    "completedWaits": 0,
                    "activeWaitUse": 0,
                    "activeWaitBought": 0,
                    "activeWaitBoth": 0
                }
            },
            "baseline": {
                "specificSubject": false,
                "increaseHabit": false,
                "decreaseHabit": false,
                "neutralHabit": true,
                "amountDonePerWeek": 0,
                "goalDonePerWeek": 0,
                "usageTimeline": "week",
                "amountSpentPerWeek": 0,
                "goalSpentPerWeek": 0,
                "spendingTimeline": "week",
                "currentTimeHours": 0,
                "currentTimeMinutes": 0,
                "goalTimeHours": 0,
                "goalTimeMinutes": 0,
                "timeTimeline": "week",
                "valuesTimesDone": false,
                "valuesTime": false,
                "valuesMoney": false,
                "valuesHealth": false,
            },
            "option": {
                "activeTab": "statistics-content",
                "liveStatsToDisplay": {
                    "goalButton": true,
                    "undoButton": true,
                    "untilGoalEnd": true,
                    "longestGoal": true,
                    "usedButton": true,
                    "usedGoalButton": true,
                    "cravedButton": true,
                    "sinceLastDone": true,
                    "timesDone": true,
                    "avgBetweenDone": true,
                    "didntPerDid": true,
                    "resistedInARow": true,
                    "spentButton": true,
                    "boughtGoalButton": true,
                    "sinceLastSpent": true,
                    "avgBetweenSpent": true,
                    "totalSpent": true,
                    "moodTracker": true
                },
                "logItemsToDisplay": {
                    "goal": true,
                    "used": true,
                    "craved": true,
                    "bought": true,
                    "mood": true
                },
                "reportItemsToDisplay": {
                    "useChangeVsBaseline": false,
                    "useChangeVsLastWeek": true,
                    "useVsResistsGraph": true,
                    "costChangeVsBaseline": false,
                    "costChangeVsLastWeek": true,
                    "useGoalVsThisWeek": false,
                    "costGoalVsThisWeek": false
                }
            },
            "report": {
                "minEndStamp": 0,
                "activeEndStamp": 0,
                "maxEndStamp": 0,
                "maxHeight": 1
            },
            "affirmations": [
                'You are Enough',
                'You are Loved',
                'Be proud of yourself',
                'You are worthy',
                'Believe in yourself',
                'You are resilient',
                'You are strong',
                'You get better every single day',
                'Your best is enough',
                'You are an amazing person',
                'You are loved and worthy',
                'You are open to opportunities',
                'Forgive your mistakes',
                'Know your worth',
                'Trust your decisions',
                'Succeed today',
                'You are allowed to take up space',
                'Nothing can stand in your way',
                'Get healthier every day'
            ]
        };


        //get configuration from storage
        function setOptionsFromStorage() {
            var jsonObject = StorageModule.retrieveStorageObject();
            json.option.activeTab = jsonObject.option.activeTab;

            //set remembered variables for settings page 
            //display logic
            json.option.liveStatsToDisplay = jsonObject.option.liveStatsToDisplay;
            json.option.logItemsToDisplay = jsonObject.option.logItemsToDisplay;
            json.option.reportItemsToDisplay = jsonObject.option.reportItemsToDisplay;

            //SETTINGS PAGE INITIAL DISPLAY
            //LIVE STATS
            for (var key in json.option.liveStatsToDisplay) {
                $("#" + key + "Displayed").prop('checked', json.option.liveStatsToDisplay[key]);
            }
            //HABIT LOG
            for (var key in json.option.logItemsToDisplay) {
                $("#" + key + "RecordDisplayed").prop('checked', json.option.logItemsToDisplay[key]);
            }
            //WEEKLY REPORT
            for (var key in json.option.reportItemsToDisplay) {
                $("#" + key + "Displayed").prop('checked', json.option.reportItemsToDisplay[key]);
            }
            //baseline questionnaire
            json.baseline = jsonObject.baseline;

            // Load baseline values from storage using the module
            BaselineModule.loadBaselineValues();

            // Add serious-user class on startup only (hides intro content for returning users)
            if (jsonObject.baseline.specificSubject) {
                $('body').addClass("serious-user");
            }
        }

        //SET STATS FROM STORAGE
        //set initial values in app			 
        function setStatsFromRecords() {
            var jsonObject = StorageModule.retrieveStorageObject();
            var timeNow = Math.round(new Date() / 1000);
            var oneWeekAgoTimeStamp = timeNow - (60 * 60 * 24 * 7);
            var oneMonthAgoTimeStamp = timeNow - (60 * 60 * 24 * 30);
            var oneYearAgoTimeStamp = timeNow - (60 * 60 * 24 * 365);

            /* USE STATISTICS */
            //total USE actions
            var useTabActions = jsonObject.action.filter(function (e) {
                return e && (e.clickType == "used" || e.clickType == "craved");
            });
            useTabActions = useTabActions.sort((a, b) => {
                return parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1;
            });

            var useTabActionsWeek = useTabActions.filter(function (e) {
                return e.timestamp >= oneWeekAgoTimeStamp;
            });

            var useTabActionsMonth = useTabActions.filter(function (e) {
                return e.timestamp >= oneMonthAgoTimeStamp;
            });

            var useTabActionsYear = useTabActions.filter(function (e) {
                return e.timestamp >= oneYearAgoTimeStamp;
            });

            // Calculate resist streaks using StatsCalculationsModule
            if (useTabActions.length > 0) {
                json.statistics.use.resistStreak.total = StatsCalculationsModule.calculateResistStreak(useTabActions);
            }
            if (useTabActionsWeek.length > 0) {
                json.statistics.use.resistStreak.week = StatsCalculationsModule.calculateResistStreak(useTabActionsWeek);
            }
            if (useTabActionsMonth.length > 0) {
                json.statistics.use.resistStreak.month = StatsCalculationsModule.calculateResistStreak(useTabActionsMonth);
            }
            if (useTabActionsYear.length > 0) {
                json.statistics.use.resistStreak.year = StatsCalculationsModule.calculateResistStreak(useTabActionsYear);
            }

            var resistStreak = json.statistics.use.resistStreak;

            $(".statistic.use.resistStreak.total").html(resistStreak.total);
            $(".statistic.use.resistStreak.week").html(resistStreak.week);
            $(".statistic.use.resistStreak.month").html(resistStreak.month);
            $(".statistic.use.resistStreak.year").html(resistStreak.year);


            //total uses
            var useCount = jsonObject.action.filter(function (e) {
                return e && e.clickType == "used";
            });
            useCount = useCount.sort((a, b) => {
                return parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1;
            });
            json.statistics.use.clickCounter = useCount.length;

            var useCountWeek = useCount.filter(function (e) {
                return e.timestamp >= oneWeekAgoTimeStamp;
            });

            var useCountMonth = useCount.filter(function (e) {
                return e.timestamp >= oneMonthAgoTimeStamp;
            });

            var useCountYear = useCount.filter(function (e) {
                return e.timestamp >= oneYearAgoTimeStamp;
            });

            //Restart timer value
            if (useCount.length > 0) {

                var sinceLastUse = useCount[useCount.length - 1].timestamp;
                TimersModule.restartTimerAtValues("use", sinceLastUse, json);

                //used to calculate avg time between from json obj, live
                json.statistics.use.firstClickStamp = useCount[0].timestamp;
                //timestamp of most recent click - to limit clicks in a row
                json.statistics.use.lastClickStamp = useCount[useCount.length - 1].timestamp;

                //average time between uses - using StatsCalculationsModule
                var avgTimeBetween = StatsCalculationsModule.calculateAverageTimeBetween(useCount, useCountWeek, useCountMonth, useCountYear);

                if (useCount.length > 1) {
                    for (const [key, value] of Object.entries(avgTimeBetween)) {
                        $(".betweenClicks.use.statistic" + "." + key).html(StatsCalculationsModule.convertSecondsToDateFormat(value, true))
                    }

                    if ($.isNumeric(avgTimeBetween.total)) {
                        json.statistics.use.betweenClicks = {
                            total: avgTimeBetween.total,
                            week: avgTimeBetween.week,
                            month: avgTimeBetween.month,
                            year: avgTimeBetween.year
                        }
                    }
                }
            }

            var doneStatistic = StatsCalculationsModule.segregatedTimeRange(timeNow, useCount);

            //update json
            json.statistics.use.totals = doneStatistic;

            $(".statistic.use.totals.total").html(doneStatistic.total);
            $(".statistic.use.totals.week").html(doneStatistic.week);
            $(".statistic.use.totals.month").html(doneStatistic.month);
            $(".statistic.use.totals.year").html(doneStatistic.year);

            //total craves
            var craveCount = jsonObject.action.filter(function (e) {
                return e && e.clickType == "craved";
            });
            json.statistics.use.craveCounter = craveCount.length;

            var craveCountWeek = craveCount.filter(function (e) {
                return e.timestamp >= oneWeekAgoTimeStamp;
            });

            var craveCountMonth = craveCount.filter(function (e) {
                return e.timestamp >= oneMonthAgoTimeStamp;
            });

            var craveCountYear = craveCount.filter(function (e) {
                return e.timestamp >= oneYearAgoTimeStamp;
            });

            //craves in a row
            var cravesInARow = 0;
            for (var i = useTabActions.length - 1; i >= 0; i--) {
                if (useTabActions[i].clickType == "craved") {
                    cravesInARow++;
                } else {
                    break;
                }
            }
            //update display	
            $("#cravingsResistedInARow").html(cravesInARow);
            //update json
            json.statistics.use.cravingsInARow = cravesInARow;

            //timestamp of most recent click - to limit clicks in a row
            if (craveCount.length > 0) {
                json.statistics.use.lastClickStampCrave = craveCount[craveCount.length - 1].timestamp;
            }

            //avg craves per smoke

            var didntPerDidtotal = Math.round(craveCount.length / useCount.length * 10) / 10;
            var didntPerDidweek = Math.round(craveCountWeek.length / useCountWeek.length * 10) / 10;
            var didntPerDidmonth = Math.round(craveCountMonth.length / useCountMonth.length * 10) / 10;
            var didntPerDidyear = Math.round(craveCountYear.length / useCountYear.length * 10) / 10;

            var didntPerDidTotals = {
                "total": isFinite(didntPerDidtotal) ? didntPerDidtotal : "N/A",
                "week": isFinite(didntPerDidweek) ? didntPerDidweek : "N/A",
                "month": isFinite(didntPerDidmonth) ? didntPerDidmonth : "N/A",
                "year": isFinite(didntPerDidyear) ? didntPerDidyear : "N/A"
            }

            json.statistics.use.didntPerDid = didntPerDidTotals;

            for (const [key, value] of Object.entries(didntPerDidTotals)) {
                //console.log(`${key}: ${value}`);
                $(".didntPerDid.statistic." + key).html(value)
            }

            /* COST STATISTICS */
            //total boughts
            var costCount = jsonObject.action.filter(function (e) {
                return e && e.clickType == "bought";
            });
            json.statistics.cost.clickCounter = costCount.length;

            var costCountWeek = costCount.filter(function (e) {
                return e.timestamp >= oneWeekAgoTimeStamp;
            });

            var costCountMonth = costCount.filter(function (e) {
                return e.timestamp >= oneMonthAgoTimeStamp;
            });

            var costCountYear = costCount.filter(function (e) {
                return e.timestamp >= oneYearAgoTimeStamp;
            });

            //Restart timer value
            if (costCount.length > 0) {
                var sinceLastCost = costCount[costCount.length - 1].timestamp;
                TimersModule.restartTimerAtValues("cost", sinceLastCost, json);

                //used to calculate avg time between from json obj, live
                json.statistics.cost.firstClickStamp = costCount[0].timestamp;
                json.statistics.cost.lastClickStamp = costCount[costCount.length - 1].timestamp;

                //average time between costs - using StatsCalculationsModule
                var avgTimeBetween = StatsCalculationsModule.calculateAverageTimeBetween(costCount, costCountWeek, costCountMonth, costCountYear);

                for (const [key, value] of Object.entries(avgTimeBetween)) {
                    $(".betweenClicks.cost.statistic" + "." + key).html(StatsCalculationsModule.convertSecondsToDateFormat(value, true))
                }

                if ($.isNumeric(avgTimeBetween.total)) {
                    json.statistics.cost.betweenClicks = {
                        total: avgTimeBetween.total,
                        week: avgTimeBetween.week,
                        month: avgTimeBetween.month,
                        year: avgTimeBetween.year
                    }
                }
            }

            var spentStatistic = StatsCalculationsModule.segregatedTimeRange(timeNow, costCount, "spent");

            //update json
            json.statistics.cost.totals = spentStatistic;

            $(".statistic.cost.totals.total").html("$" + spentStatistic.total);
            $(".statistic.cost.totals.week").html("$" + spentStatistic.week);
            $(".statistic.cost.totals.month").html("$" + spentStatistic.month);
            $(".statistic.cost.totals.year").html("$" + spentStatistic.year);


            var moodCount = jsonObject.action.filter(function (e) {
                return e && e.clickType == "mood";
            });

            /* TIME SPENT STATISTICS */
            var timedCount = jsonObject.action.filter(function (e) {
                return e && e.clickType == "timed";
            });
            
            if (timedCount.length > 0 && typeof ActivityTimerModule !== 'undefined') {
                // Calculate and display time spent stats
                ActivityTimerModule.updateTimeSpentStats();
            }

            /* GOAL STATISTICS*/
            var goalCount = jsonObject.action.filter(function (e) {
                return e && e.clickType == "goal";
            });
            goalCount = goalCount.sort((a, b) => {
                return parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1;
            })
            //goal status
            //1 == active goal
            //2 == partially completed goal
            //3 == completed goal

            if (goalCount.length > 0) {
                var activeGoals = goalCount.filter(function (e) {
                    return e.status == 1
                });

                activeGoals = activeGoals.sort((a, b) => {
                    return parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1;
                })

                var inactiveGoals = goalCount.filter(function (e) {
                    return e.status == 2 || e.status == 3
                });
                var inactiveGoalsWeek = goalCount.filter(function (e) {
                    return (e.status == 2 || e.status == 3) && e.timestamp >= oneWeekAgoTimeStamp
                });
                var inactiveGoalsMonth = goalCount.filter(function (e) {
                    return (e.status == 2 || e.status == 3) && e.timestamp >= oneMonthAgoTimeStamp
                });
                var inactiveGoalsYear = goalCount.filter(function (e) {
                    return (e.status == 2 || e.status == 3) && e.timestamp >= oneYearAgoTimeStamp
                });

                //timestamp of most recent click - to limit clicks in a row
                json.statistics.wait.lastClickStamp = goalCount[goalCount.length - 1].timestamp;
                json.statistics.wait.clickCounter = goalCount.length;

                if (activeGoals.length > 0) {
                    var mostRecentGoal = activeGoals[activeGoals.length - 1];

                    //set var in json for if there is an active wait of X type - 
                    //to be used on click of relevant buttons to end wait
                    if (mostRecentGoal.goalType == "both") {
                        json.statistics.wait.activeWaitBoth = 1;
                    } else if (mostRecentGoal.goalType == "use") {
                        json.statistics.wait.activeWaitUse = 1;
                    } else if (mostRecentGoal.goalType == "bought") {
                        json.statistics.wait.activeWaitBought = 1;
                    }

                    var totalSecondsUntilGoalEnd = mostRecentGoal.goalStamp - timeNow;
                    if (totalSecondsUntilGoalEnd <= 0) {
                        // Goal ended while user was away
                        NotificationsModule.createGoalEndNotification(mostRecentGoal);
                    }
                    // Note: Active wait timer panels are restored by WaitTimerModule.restoreActiveWaitTimers()
                }

                if (inactiveGoals.length > 0) {
                    // Use the wait statistics object
                    var waitStats = json.statistics.wait;
                    var longestStats = waitStats.longestWait;
                    
                    //number of waits completed
                    waitStats.completedWaits = inactiveGoals.length;
                    $("#numberOfWaitsCompleted, #numberOfGoalsCompleted").html(inactiveGoals.length);

                    // Calculate longest waits using StatsCalculationsModule
                    var longestTotal = StatsCalculationsModule.calculateLongestGoalFromSet(inactiveGoals);
                    longestStats["total"] = longestTotal;
                    $(".statistic.longestWait.total, .statistic.longestGoal.total").html(StatsCalculationsModule.convertSecondsToDateFormat(longestTotal, true));

                    if (inactiveGoalsWeek.length > 0) {
                        var longestWeek = StatsCalculationsModule.calculateLongestGoalFromSet(inactiveGoalsWeek);
                        longestStats["week"] = longestWeek;
                        $(".statistic.longestWait.week, .statistic.longestGoal.week").html(StatsCalculationsModule.convertSecondsToDateFormat(longestWeek, true));
                    } else {
                        longestStats["week"] = "N/A";
                        $(".statistic.longestWait.week, .statistic.longestGoal.week").html("N/A");
                    }

                    if (inactiveGoalsMonth.length > 0) {
                        var longestMonth = StatsCalculationsModule.calculateLongestGoalFromSet(inactiveGoalsMonth);
                        longestStats["month"] = longestMonth;
                        $(".statistic.longestWait.month, .statistic.longestGoal.month").html(StatsCalculationsModule.convertSecondsToDateFormat(longestMonth, true));
                    } else {
                        longestStats["month"] = "N/A";
                    }

                    if (inactiveGoalsYear.length > 0) {
                        var longestYear = StatsCalculationsModule.calculateLongestGoalFromSet(inactiveGoalsYear);
                        longestStats["year"] = longestYear;
                        $(".statistic.longestWait.year, .statistic.longestGoal.year").html(StatsCalculationsModule.convertSecondsToDateFormat(longestYear, true));
                    } else {
                        longestStats["year"] = "N/A";
                    }
                }
            }


            //NEEEWWWWW USERRR
            if ((useCount == 0 && craveCount == 0 && costCount == 0 && moodCount == 0 && goalCount == 0)
                && json.baseline.specificSubject == false
                && json.option.activeTab == "settings-content") {
                var introMessage = "<b>Welcome back!</b> Start tracking your habit now by clicking any of the buttons on the right.";
                var responseTools = '<button class="btn btn-md btn-outline-info clear-notification" onClick="$(\'.statistics-tab-toggler\').click();">' +
                    "Statistics Panel</button>";

                NotificationsModule.createNotification(introMessage, responseTools);

            } else {

                ActionLogModule.populateHabitLogOnLoad();
            }
        }

        NotificationsModule.init(json);
        TabsModule.init(json, userWasInactive);
        SettingsModule.init(json);
        BaselineModule.init(json);
        UIModule.init(json);
        ActionLogModule.init(json);
        WaitModule.init(json);
        BehavioralGoalsModule.init(json);
        ButtonsModule.init(json);
        
        // Initialize ActivityTimerModule for time spent tracking
        if (typeof ActivityTimerModule !== 'undefined') {
            ActivityTimerModule.init(json);
        }

        // Initialize WaitTimerModule for delayed gratification / procrastination tracking
        if (typeof WaitTimerModule !== 'undefined') {
            WaitTimerModule.init(json);
        }
        /* CALL INITIAL STATE OF APP */
        //If json action table doesn't exist, create it
        if (StorageModule.hasStorageData()) {
            setOptionsFromStorage();
            setStatsFromRecords();

            //set stats	
            //set total clicks for each button
            $("#use-total").html(json.statistics.use.clickCounter);
            $("#crave-total").html(json.statistics.use.craveCounter);
            $("#bought-total").html(json.statistics.cost.clickCounter);

            //Average time between
            StatsDisplayModule.displayAverageTimeBetween("use", "total", json);
            StatsDisplayModule.displayAverageTimeBetween("use", "week", json);
            StatsDisplayModule.displayAverageTimeBetween("use", "month", json);
            StatsDisplayModule.displayAverageTimeBetween("cost", "total", json);
            StatsDisplayModule.displayAverageTimeBetween("cost", "week", json);
            StatsDisplayModule.displayAverageTimeBetween("cost", "month", json);

            $(".longestWait.statistic, .longestGoal.statistic").parent().hide();
            var waitStats = json.statistics.wait;
            var bestTime = waitStats ? waitStats.longestWait : null;
            if (bestTime && bestTime.week !== "N/A") {
                $(".longestWait.week.statistic, .longestGoal.week.statistic").parent().show();
                StatsDisplayModule.displayLongestWait("week", json);
            } else if (bestTime && bestTime.month !== "N/A" && bestTime.month !== bestTime.week) {
                $(".longestWait.month.statistic, .longestGoal.month.statistic").parent().show();
                StatsDisplayModule.displayLongestWait("month", json);
            }
            if (bestTime && bestTime.total !== "N/A"
                && bestTime.total !== bestTime.week
                && bestTime.total !== bestTime.month) {

                $(".longestWait.total.statistic, .longestGoal.total.statistic").parent().show();
                StatsDisplayModule.displayLongestWait("total", json);
            }

            TabsModule.returnToActiveTab();
            TimersModule.hideTimersOnLoad(json);

            //after all is said and done 
            UIModule.toggleActiveStatGroups(json);
            UIModule.hideInactiveStatistics(json);

            //get them notifcations for useful reports
            StatsDisplayModule.initiateReport(json);

        } else {
            //replace this with 
            //empty action table
            //basic stat display settings option table
            var newJsonString = '{ "version": 3, "action": [], "behavioralGoals": [], "activeTimers": [], "customUnits": [], ' +
                '  "baseline": {"userSubmitted": false, "specificSubject": false, "increaseHabit": false, "decreaseHabit": false, "neutralHabit": true, "amountDonePerWeek": 0, "goalDonePerWeek": 0, "usageTimeline": "week", "amountSpentPerWeek": 0, "goalSpentPerWeek": 0, "spendingTimeline": "week", "currentTimeHours": 0, "currentTimeMinutes": 0, "goalTimeHours": 0, "goalTimeMinutes": 0, "timeTimeline": "week", "valuesTimesDone": false, "valuesTime": false, "valuesMoney": false, "valuesHealth": false},' +
                '  "option": { "activeTab" : "baseline-content",' +
                '"liveStatsToDisplay": { "waitButton": true, "undoButton": true, "untilWaitEnd": true, "longestWait": true, "usedButton": true, "cravedButton": true, "sinceLastDone": true, "timesDone": false, "avgBetweenDone": true, "didntPerDid": true, "resistedInARow": true, "spentButton": true, "sinceLastSpent": true, "avgBetweenSpent": true, "totalSpent": true, "moodTracker": true, "timeSpentDoing": true, "activeTimer": true },' +
                '"logItemsToDisplay" : {"wait": true, "used": true, "craved": true, "bought": true, "mood": true, "timed": true},' +
                '"reportItemsToDisplay" : {	"useChangeVsBaseline": false, "useChangeVsLastWeek": true, "useVsResistsGraph": true, "costChangeVsBaseline": false, "costChangeVsLastWeek": true, "useGoalVsThisWeek": false, "costGoalVsThisWeek": false}' +
                '} }';
            localStorage.setItem("esCrave", newJsonString);

            UIModule.toggleActiveStatGroups(json);
            UIModule.hideInactiveStatistics(json);

            $(".baseline-tab-toggler").click();

        }


        //Restrict possible dates chosen in wait tab datepicker
        //restrictGoalRange();
        $("#waitEndPicker").datepicker({ minDate: 0 });
        //INITIALIZE WAIT DATE TIME PICKER
        $("#waitEndPicker").datepicker();

        $(".wait.log-more-info button.cancel").click(function () {
            UIModule.closeClickDialog(".wait");
        });

        // App loaded successfully - cancel the fallback error screen
        if (typeof window.cancelAppFallback === 'function') {
            window.cancelAppFallback();
        }

    } else {
        //NO LOCAL STORAGE
        alert("This app uses your local storage to store your data." +
            " That means we DO NO STORE YOUR DATA. You store your data." +
            " BUT, your browser doesn't support local storage, so your data cannot be saved.");
    }

    //refreshes the page automatically, upon user action,
    //to refresh timers from local storage timestamp
    (function manageInactivity() {
        var idleTime = 0;
        //Increment the idle time counter every minute.
        var idleInterval = setInterval(timerIncrement, 1000); // 1 minute

        //Zero the idle timer on mouse movement.
        $(this).mousemove(function (e) {
            idleTime = 0;
        });
        $(this).keypress(function (e) {
            idleTime = 0;
        });

        function timerIncrement() {

            if (document.visibilityState == "hidden") {
                userWasInactive = true;
            }

            idleTime = idleTime + 1;
            if (idleTime >= 10) { // 5 minutes
                if (userWasInactive && document.visibilityState == "visible") {
                    window.location.reload();
                }
            }
        }

    })();

});