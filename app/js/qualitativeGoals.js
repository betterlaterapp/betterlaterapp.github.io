/**
 * QualitativeGoalsModule
 * Handles qualitative/wellbeing behavioral goals
 */
var QualitativeGoalsModule = (function() {

    /**
     * Create a new qualitative behavioral goal
     */
    function createQualitativeGoal(tenetText, completionTimeline, initialMood, initialComment) {
        var behavioralGoal = {
            id: GoalsModule.generateBehavioralGoalId(),
            type: 'qualitative',
            tenetText: tenetText,
            completionTimeline: completionTimeline,
            createdAt: Date.now(),
            status: 'active',
            unit: null,
            currentAmount: null,
            goalAmount: null,
            measurementTimeline: null,
            moodRecords: []
        };

        var savedGoal = GoalsModule.saveBehavioralGoal(behavioralGoal);

        if (savedGoal && (initialMood !== undefined || initialComment)) {
            createMoodRecordForBehavioralGoal(savedGoal.id, initialMood, initialComment);
        }

        return savedGoal;
    }

    /**
     * Create a mood record linked to a qualitative behavioral goal
     */
    function createMoodRecordForBehavioralGoal(goalId, smileyValue, comment) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var now = Math.round(Date.now() / 1000);

        var newRecord = {
            timestamp: now.toString(),
            clickType: 'mood',
            clickStamp: now,
            comment: comment || '',
            smiley: smileyValue,
            behavioralGoalId: goalId
        };

        jsonObject.action.push(newRecord);

        if (jsonObject.behavioralGoals) {
            var goal = jsonObject.behavioralGoals.find(function(g) { return g.id === goalId; });
            if (goal && goal.moodRecords) {
                goal.moodRecords.push(now.toString());
            }
        }

        StorageModule.setStorageObject(jsonObject);

        ActionLogModule.placeActionIntoLog(now, 'mood', null, comment, smileyValue, false);

        return newRecord;
    }

    /**
     * Get mood records linked to a specific behavioral goal
     */
    function getMoodRecordsForGoal(goalId) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var moodRecords = jsonObject.action.filter(function(a) {
            return a && a.clickType === 'mood' && a.behavioralGoalId === goalId;
        });
        return moodRecords.sort(function(a, b) {
            return parseInt(b.timestamp) - parseInt(a.timestamp);
        });
    }

    /**
     * Calculate average mood for a goal's mood records
     */
    function calculateAverageMood(moodRecords) {
        if (!moodRecords || moodRecords.length === 0) return null;
        var sum = moodRecords.reduce(function(acc, r) {
            return acc + (parseInt(r.smiley) || 0);
        }, 0);
        return (sum / moodRecords.length).toFixed(1);
    }

    /**
     * Get mood smiley image path from average value
     */
    function getMoodSmileyPath(avgMood) {
        if (avgMood === null) return null;
        var val = Math.round(parseFloat(avgMood));
        val = Math.max(0, Math.min(4, val));
        return '../assets/images/mood-smiley-' + val + '.png';
    }

    /**
     * Render list of mood records
     */
    function renderMoodRecordsList(records) {
        if (!records || records.length === 0) {
            return '<p class="text-muted text-center" style="font-size: 0.85rem;">No check-ins yet.</p>';
        }

        var html = '';
        records.forEach(function(record) {
            var date = new Date(parseInt(record.timestamp) * 1000);
            var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            var smileyPath = '../assets/images/mood-smiley-' + (record.smiley || 2) + '.png';

            html += '<div class="mood-record-row">' +
                '<img class="mood-smiley-img" src="' + smileyPath + '" alt="mood">' +
                '<div class="mood-record-info">' +
                    '<div class="mood-record-comment">' + GoalsModule.escapeHtml(record.comment || 'No comment') + '</div>' +
                    '<div class="mood-record-date">' + dateStr + '</div>' +
                '</div>' +
            '</div>';
        });

        return html;
    }

    /**
     * Render qualitative/wellbeing goal item
     */
    function renderQualitativeGoalItem(goal, index) {
        var moodRecords = getMoodRecordsForGoal(goal.id);
        var avgMood = calculateAverageMood(moodRecords);
        var daysRemaining = GoalsModule.calculateDaysRemaining(goal);
        var progressPct = Math.min(100, Math.round((GoalsModule.calculateDaysElapsed(goal) / goal.completionTimeline) * 100));

        var colorClass = 'goal-neutral';
        if (avgMood !== null) {
            colorClass = parseFloat(avgMood) >= 2.5 ? 'goal-good-mood' : 'goal-bad-mood';
        }

        var moodSmileyPath = getMoodSmileyPath(avgMood);

        var html = '<div class="goal-accordion-item ' + colorClass + '" data-goal-id="' + goal.id + '" data-goal-type="qualitative">' +
            '<div class="goal-summary">' +
                '<div class="goal-summary-header">' +
                    '<span class="goal-type-badge badge-qualitative">Wellbeing</span>' +
                    '<span class="goal-days-left">' + daysRemaining.toFixed(1) + ' days left</span>' +
                '</div>' +
                '<div class="goal-summary-title">' + GoalsModule.escapeHtml(GoalsModule.truncateText(goal.tenetText, 100)) + '</div>' +
                '<div class="goal-summary-stats">' +
                    '<div class="goal-stat-item">' +
                        '<span class="goal-stat-value">' +
                            (moodSmileyPath ? '<img class="mood-smiley-img" src="' + moodSmileyPath + '" alt="mood">' : '—') +
                        '</span>' +
                        '<span class="goal-stat-label">Avg Mood</span>' +
                    '</div>' +
                    '<div class="goal-stat-item">' +
                        '<span class="goal-stat-value">' + moodRecords.length + '</span>' +
                        '<span class="goal-stat-label">Check-ins</span>' +
                    '</div>' +
                '</div>' +
                '<div class="goal-inline-checkin" data-goal-id="' + goal.id + '">' +
                    '<div class="inline-smileys">' +
                        '<img class="inline-smiley" data-mood="0" src="../assets/images/mood-smiley-0.png" alt="Very bad">' +
                        '<img class="inline-smiley" data-mood="1" src="../assets/images/mood-smiley-1.png" alt="Bad">' +
                        '<img class="inline-smiley selected" data-mood="2" src="../assets/images/mood-smiley-2.png" alt="Neutral">' +
                        '<img class="inline-smiley" data-mood="3" src="../assets/images/mood-smiley-3.png" alt="Good">' +
                        '<img class="inline-smiley" data-mood="4" src="../assets/images/mood-smiley-4.png" alt="Very good">' +
                    '</div>' +
                    '<button class="btn btn-outline-success btn-sm inline-checkin-btn" data-goal-id="' + goal.id + '">' +
                        '<i class="fas fa-plus"></i> Check-in' +
                    '</button>' +
                '</div>' +
                '<i class="fas fa-chevron-down goal-expand-icon"></i>' +
            '</div>' +
            '<div class="goal-details">' +
                '<div class="goal-details-content">' +
                    '<div class="goal-progress-container">' +
                        '<div class="goal-progress-bar">' +
                            '<div class="goal-progress-fill ' + (parseFloat(avgMood) >= 2.5 ? 'on-track' : 'behind') + '" style="width: ' + progressPct + '%"></div>' +
                        '</div>' +
                        '<div class="goal-progress-text">' + progressPct + '% of time elapsed</div>' +
                    '</div>' +
                    '<div class="goal-mood-records">' +
                        '<h5><i class="fas fa-history"></i> Recent Check-ins</h5>' +
                        renderMoodRecordsList(moodRecords.slice(0, 5)) +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

        return html;
    }

    /**
     * Handle create goal form submission (from dialog)
     */
    function handleCreateGoalSubmit(completionTimeline) {
        var tenetText = $('.create-tenet-text').val();

        if (!tenetText || tenetText.trim() === '') {
            alert('Please enter your wellness goal');
            return null;
        }

        var selectedMood = $('.create-health-mood-tracker .smiley.selected').data('mood');
        if (selectedMood === undefined) selectedMood = 2;

        return createQualitativeGoal(tenetText, completionTimeline, selectedMood, '');
    }

    /**
     * Validate and create goal from baseline questionnaire form
     */
    function validateAndCreateFromForm(questionSetElement) {
        var errors = [];
        var data = {};

        data.tenetText = questionSetElement.find('.tenet-text').val();
        data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 7;

        var selectedMood = questionSetElement.find('.smiley.selected');
        if (selectedMood.length) {
            var moodMatch = selectedMood.attr('class').match(/mood-(\d)/);
            data.initialMood = moodMatch ? parseInt(moodMatch[1]) : 2;
        } else {
            data.initialMood = 2;
        }
        data.initialComment = questionSetElement.find('.mood-comment-text').val() || '';

        if (!data.tenetText || data.tenetText.trim() === '') {
            errors.push('Please enter your wellness goal');
        }

        if (errors.length > 0) {
            alert(errors.join('\n'));
            return null;
        }

        return createQualitativeGoal(data.tenetText, data.completionTimeline, data.initialMood, data.initialComment);
    }

    // Public API
    return {
        createQualitativeGoal: createQualitativeGoal,
        createMoodRecordForBehavioralGoal: createMoodRecordForBehavioralGoal,
        getMoodRecordsForGoal: getMoodRecordsForGoal,
        calculateAverageMood: calculateAverageMood,
        getMoodSmileyPath: getMoodSmileyPath,
        renderMoodRecordsList: renderMoodRecordsList,
        renderQualitativeGoalItem: renderQualitativeGoalItem,
        handleCreateGoalSubmit: handleCreateGoalSubmit,
        validateAndCreateFromForm: validateAndCreateFromForm
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QualitativeGoalsModule;
} else {
    window.QualitativeGoalsModule = QualitativeGoalsModule;
}
