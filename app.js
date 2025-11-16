/****************************************************************************


Copyright (c) 2021 Corey Boiko

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
                "goal": {
                    "untilTimerEnd": {
                        "totalSeconds": 0,
                        "days": 0,
                        "hours": 0,
                        "minutes": 0,
                        "seconds": 0
                    },
                    "clickCounter": 0,
                    "lastClickStamp": 0,
                    "longestGoal": {
                        "total": 0,
                        "week": 0,
                        "month": 0,
                        "year": 0
                    },
                    "completedGoals": 0,
                    "activeGoalUse": 0,
                    "activeGoalBought": 0,
                    "activeGoalBoth": 0
                }
            },
            "baseline": {
                "specificSubject": false,
                "decreaseHabit": true,
                "useStatsIrrelevant": false,
                "costStatsIrrelevant": false,
                "amountDonePerWeek": 0,
                "goalDonePerWeek": 0,
                "amountSpentPerWeek": 0,
                "goalSpentPerWeek": 0,
                "valuesTime": true,
                "valuesMoney": true,
                "valuesHealth": true,

            },
            "option": {
                "activeTab": "reports-content",
                "liveStatsToDisplay": {
                    "goalButton": true,
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
                    "totalSpent": true
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
                'You are grateful',
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

            // Form population moved to BaselineModule.loadBaselineValues()

            // Checkbox handling moved to BaselineModule.loadBaselineValues()
        }

    /* HELPER FUNCTIONS FOR STATISTICS CALCULATION */
    
    /**
     * Calculate resist streak from actions (craved vs used)
     * @param {Array} actions - Array of use/crave actions
     * @returns {number} - The longest resist streak
     */
    function calculateResistStreak(actions) {
                var runningTotal = 0;
                var streak = 0;

        for (const [i, action] of actions.entries()) {
            // Last action found
            if (actions.length == i + 1) {
                        if (action.clickType == "craved") { streak++; }
                        if (streak > runningTotal) { runningTotal = streak; }
                        break;
                    }

                    if (action.clickType == "craved") {
                        streak++;
                        continue;
                    }

                    if (action.clickType == "used") {
                        if (streak > runningTotal) { runningTotal = streak; }
                        streak = 0;
            }
        }

        return runningTotal;
    }

    /**
     * Calculate average time between actions
     * @param {Array} counts - Array of action records with timestamps
     * @param {Array} countsWeek - Week filtered actions
     * @param {Array} countsMonth - Month filtered actions
     * @param {Array} countsYear - Year filtered actions
     * @returns {Object} - Object with total, week, month, year averages
     */
    function calculateAverageTimeBetween(counts, countsWeek, countsMonth, countsYear) {
        var totalTimeBetween = {};
        var avgTimeBetween = {};

        totalTimeBetween.total = counts[counts.length - 1].timestamp - counts[0].timestamp;
        
        if (counts.length > 1) {
            avgTimeBetween.total = Math.round(totalTimeBetween.total / (counts.length - 1));
        } else {
            avgTimeBetween.total = Math.round(totalTimeBetween.total);
        }

        // Week calculation
        if (countsWeek.length > 1) {
            if (countsMonth.length == countsWeek.length) {
                totalTimeBetween.week = countsWeek[countsWeek.length - 1].timestamp - countsWeek[0].timestamp;
                avgTimeBetween.week = Math.round(totalTimeBetween.week / (countsWeek.length - 1));
            } else {
                totalTimeBetween.week = 7 * 24 * 60 * 60;
                avgTimeBetween.week = Math.round(totalTimeBetween.week / (countsWeek.length - 1));
            }
        } else {
            totalTimeBetween.week = 7 * 24 * 60 * 60;
            avgTimeBetween.week = 7 * 24 * 60 * 60;
        }

        // Month calculation
        if (countsMonth.length > 1) {
            if (countsYear.length == countsMonth.length) {
                totalTimeBetween.month = countsMonth[countsMonth.length - 1].timestamp - countsMonth[0].timestamp;
                avgTimeBetween.month = Math.round(totalTimeBetween.month / (countsMonth.length - 1));
            } else {
                totalTimeBetween.month = 30 * 24 * 60 * 60;
                avgTimeBetween.month = Math.round(totalTimeBetween.month / (countsMonth.length - 1));
            }
        } else {
            totalTimeBetween.month = 30 * 24 * 60 * 60;
            avgTimeBetween.month = 30 * 24 * 60 * 60;
        }

        // Year calculation
        if (countsYear.length > 1) {
            if (countsYear.length == counts.length) {
                totalTimeBetween.year = countsYear[countsYear.length - 1].timestamp - countsYear[0].timestamp;
                avgTimeBetween.year = Math.round(totalTimeBetween.year / (countsYear.length - 1));
            } else {
                totalTimeBetween.year = 365 * 24 * 60 * 60;
                avgTimeBetween.year = Math.round(totalTimeBetween.year / (countsYear.length - 1));
            }
        } else {
            totalTimeBetween.year = 365 * 24 * 60 * 60;
            avgTimeBetween.year = 365 * 24 * 60 * 60;
        }

        return avgTimeBetween;
    }

    /**
     * Calculate longest goal from a set of goals
     * @param {Array} goals - Array of goal records
     * @returns {number} - Duration of longest goal in seconds
     */
    function calculateLongestGoalFromSet(goals) {
        var largestDiff = 0;

        for (var i = 0; i < goals.length; i++) {
            var currStartStamp = goals[i].timestamp;
            var currEndStamp = goals[i].goalStopped;
            var currDiff = currEndStamp - currStartStamp;
            
            if (largestDiff < currDiff) {
                largestDiff = currDiff;
            }
        }

        return largestDiff;
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
                return e.clickType == "used" || e.clickType == "craved";
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

            // Calculate resist streaks using helper function (eliminates ~120 lines of duplication)
            if (useTabActions.length > 0) {
                json.statistics.use.resistStreak.total = calculateResistStreak(useTabActions);
            }
            if (useTabActionsWeek.length > 0) {
                json.statistics.use.resistStreak.week = calculateResistStreak(useTabActionsWeek);
            }
            if (useTabActionsMonth.length > 0) {
                json.statistics.use.resistStreak.month = calculateResistStreak(useTabActionsMonth);
            }
            if (useTabActionsYear.length > 0) {
                json.statistics.use.resistStreak.year = calculateResistStreak(useTabActionsYear);
            }

            var resistStreak = json.statistics.use.resistStreak;

            $(".statistic.use.resistStreak.total").html(resistStreak.total);
            $(".statistic.use.resistStreak.week").html(resistStreak.week);
            $(".statistic.use.resistStreak.month").html(resistStreak.month);
            $(".statistic.use.resistStreak.year").html(resistStreak.year);


            //total uses
            var useCount = jsonObject.action.filter(function (e) {
                return e.clickType == "used";
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

                //average time between uses - using helper function
                var avgTimeBetween = calculateAverageTimeBetween(useCount, useCountWeek, useCountMonth, useCountYear);

                if (useCount.length > 1) {
                    for (const [key, value] of Object.entries(avgTimeBetween)) {
                        $(".betweenClicks.use.statistic" + "." + key).html(StatisticsModule.convertSecondsToDateFormat(value, true))
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

            var doneStatistic = StatisticsModule.segregatedTimeRange(timeNow, useCount);

            //update json
            json.statistics.use.totals = doneStatistic;

            $(".statistic.use.totals.total").html(doneStatistic.total);
            $(".statistic.use.totals.week").html(doneStatistic.week);
            $(".statistic.use.totals.month").html(doneStatistic.month);
            $(".statistic.use.totals.year").html(doneStatistic.year);

            //total craves
            var craveCount = jsonObject.action.filter(function (e) {
                return e.clickType == "craved";
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
                return e.clickType == "bought";
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

                //average time between costs - using helper function
                var avgTimeBetween = calculateAverageTimeBetween(costCount, costCountWeek, costCountMonth, costCountYear);

                for (const [key, value] of Object.entries(avgTimeBetween)) {
                    $(".betweenClicks.cost.statistic" + "." + key).html(StatisticsModule.convertSecondsToDateFormat(value, true))
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

            var spentStatistic = StatisticsModule.segregatedTimeRange(timeNow, costCount, "spent");

            //update json
            json.statistics.cost.totals = spentStatistic;

            $(".statistic.cost.totals.total").html("$" + spentStatistic.total);
            $(".statistic.cost.totals.week").html("$" + spentStatistic.week);
            $(".statistic.cost.totals.month").html("$" + spentStatistic.month);
            $(".statistic.cost.totals.year").html("$" + spentStatistic.year);


            var moodCount = jsonObject.action.filter(function (e) {
                return e.clickType == "mood";
            });

            /* GOAL STATISTICS*/
            var goalCount = jsonObject.action.filter(function (e) {
                return e.clickType == "goal";
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
                json.statistics.goal.lastClickStamp = goalCount[goalCount.length - 1].timestamp;
                json.statistics.goal.clickCounter = goalCount.length;

                if (activeGoals.length > 0) {
                    var mostRecentGoal = activeGoals[activeGoals.length - 1];

                    //set var in json for if there is an active goal of X type - 
                    //to be used on click of relevant buttons to end goal
                    if (mostRecentGoal.goalType == "both") {
                        json.statistics.goal.activeGoalBoth = 1;
                    } else if (mostRecentGoal.goalType == "use") {
                        json.statistics.goal.activeGoalUse = 1;
                    } else if (mostRecentGoal.goalType == "bought") {
                        json.statistics.goal.activeGoalBought = 1;
                    }

                    var totalSecondsUntilGoalEnd = mostRecentGoal.goalStamp - timeNow;
                    if (totalSecondsUntilGoalEnd > 0) {
                        TimersModule.loadGoalTimerValues(totalSecondsUntilGoalEnd, json);
                        TimerStateManager.initiate('goal', undefined, json);
                    } else {
                        //goal ended while user was away
                        var mostRecentGoal = goalCount[goalCount.length - 1];
                        NotificationsModule.createGoalEndNotification(mostRecentGoal);
                        //last made goal time has concluded
                        $("#goal-content .timer-recepticle").hide();
                    }
                } else {
                    //hide empty timer when last goal has ended
                    $("#goal-content .timer-recepticle").hide();
                }

                if (inactiveGoals.length > 0) {
                    //number of goals Completed
                    json.statistics.goal.completedGoals = inactiveGoals.length;
                    $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);

                    // Calculate longest goals using helper function (eliminates ~100 lines of duplication)
                    var longestTotal = calculateLongestGoalFromSet(inactiveGoals);
                    json.statistics.goal.longestGoal["total"] = longestTotal;
                    $(".statistic.longestGoal.total").html(StatisticsModule.convertSecondsToDateFormat(longestTotal, true));

                    if (inactiveGoalsWeek.length > 0) {
                        var longestWeek = calculateLongestGoalFromSet(inactiveGoalsWeek);
                        json.statistics.goal.longestGoal["week"] = longestWeek;
                        $(".statistic.longestGoal.week").html(StatisticsModule.convertSecondsToDateFormat(longestWeek, true));
                    } else {
                        json.statistics.goal.longestGoal["week"] = "N/A";
                        $(".statistic.longestGoal.week").html("N/A");
                    }

                    if (inactiveGoalsMonth.length > 0) {
                        var longestMonth = calculateLongestGoalFromSet(inactiveGoalsMonth);
                        json.statistics.goal.longestGoal["month"] = longestMonth;
                        $(".statistic.longestGoal.month").html(StatisticsModule.convertSecondsToDateFormat(longestMonth, true));
                    } else {
                        json.statistics.goal.longestGoal["month"] = "N/A";
                    }

                    if (inactiveGoalsYear.length > 0) {
                        var longestYear = calculateLongestGoalFromSet(inactiveGoalsYear);
                        json.statistics.goal.longestGoal["year"] = longestYear;
                        $(".statistic.longestGoal.year").html(StatisticsModule.convertSecondsToDateFormat(longestYear, true));
                    } else {
                        json.statistics.goal.longestGoal["year"] = "N/A";
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
        GoalsModule.init(json);
        ButtonsModule.init(json);

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
            StatisticsModule.displayAverageTimeBetween("use", "total", json);
            StatisticsModule.displayAverageTimeBetween("use", "week", json);
            StatisticsModule.displayAverageTimeBetween("use", "month", json);
            StatisticsModule.displayAverageTimeBetween("cost", "total", json);
            StatisticsModule.displayAverageTimeBetween("cost", "week", json);
            StatisticsModule.displayAverageTimeBetween("cost", "month", json);

            $(".longestGoal.statistic").parent().hide();
            var bestTime = json.statistics.goal.longestGoal;
            if (bestTime.week !== "N/A") {
                $(".longestGoal.week.statistic").parent().show();
                StatisticsModule.displayLongestGoal("week", json);
            } else if (bestTime.month !== "N/A" && bestTime.month !== bestTime.week) {
                $(".longestGoal.month.statistic").parent().show();
                StatisticsModule.displayLongestGoal("month", json);
            }
            if (bestTime.total !== "N/A"
                && bestTime.total !== bestTime.week
                && bestTime.total !== bestTime.month) {

                $(".longestGoal.total.statistic").parent().show();
                StatisticsModule.displayLongestGoal("total", json);
            }

            TabsModule.returnToActiveTab();
            TimersModule.hideTimersOnLoad(json);

            //after all is said and done 
            UIModule.toggleActiveStatGroups(json);
            UIModule.hideInactiveStatistics(json);

            //get them notifcations for useful reports
            StatisticsModule.initiateReport(json);

        } else {
            //replace this with 
            //empty action table
            //basic stat display settings option table
            var newJsonString = '{ "action": [], ' +
                '  "baseline": {"userSubmitted": false, "specificSubject": false, "decreaseHabit": true, "useStatsIrrelevant": false, "costStatsIrrelevant": false, "amountDonePerWeek":"0","goalDonePerWeek":"0","amountSpentPerWeek":"0","goalSpentPerWeek":"0", "valuesTime": true, "valuesMoney": true, "valuesHealth": true},' +
                '  "option": { "activeTab" : "settings-content",' +
                '"liveStatsToDisplay": { "goalButton": true, "untilGoalEnd": true, "longestGoal": true, "usedButton": true, "usedGoalButton": true, "cravedButton": true, "sinceLastDone": true, "timesDone": false, "avgBetweenDone": true, "didntPerDid": true, "resistedInARow": true, "spentButton": true, "boughtGoalButton": true, "sinceLastSpent": true, "avgBetweenSpent": true, "totalSpent": true },' +
                '"logItemsToDisplay" : {"goal": true, "used": true, "craved": true,	"bought": true, "mood": true},' +
                '"reportItemsToDisplay" : {	"useChangeVsBaseline": false, "useChangeVsLastWeek": true, "useVsResistsGraph": true, "costChangeVsBaseline": false, "costChangeVsLastWeek": true, "useGoalVsThisWeek": false, "costGoalVsThisWeek": false}' +
                '} }';
            localStorage.setItem("esCrave", newJsonString);

            UIModule.toggleActiveStatGroups(json);
            UIModule.hideInactiveStatistics(json);

            $(".settings-tab-toggler").click();
            $(".displayed-statistics-heading").hide();

            //ABSOLUTE NEW USER
            var introMessage = "<b>Welcome to Better Later</b> - the anonymous habit tracking app that shows you statistics about your habit as you go!";
            NotificationsModule.createNotification(introMessage);
        }


        //Restrict possible dates chosen in goal tab datepicker
        //restrictGoalRange();
        $("#goalEndPicker").datepicker({ minDate: 0 });
        //INITIALIZE GOAL DATE TIME PICKER
        $("#goalEndPicker").datepicker();

        $(".goal.log-more-info button.cancel").click(function () {
            UIModule.closeClickDialog(".goal");
        });

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