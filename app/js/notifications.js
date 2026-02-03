var NotificationsModule = (function () {
    var NOTIFICATION_STAY_DURATION = 4500;
    var NOTIFICATION_FADE_DURATION = 3000;
    var MAX_NOTIFICATIONS = 40;

    function isStorageReady() {
        return StorageModule.hasStorageData();
    }

    function getStoredNotifications() {
        if (!isStorageReady()) return [];
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject.notifications) {
            jsonObject.notifications = [];
            StorageModule.setStorageObject(jsonObject);
        }
        return jsonObject.notifications;
    }

    function hasDuplicateNotification(message) {
        return getStoredNotifications().some(function(n) {
            return n.message === message && !n.read;
        });
    }

    function saveNotification(notification) {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject.notifications) jsonObject.notifications = [];
        jsonObject.notifications.unshift(notification);
        if (jsonObject.notifications.length > MAX_NOTIFICATIONS) {
            jsonObject.notifications = jsonObject.notifications.slice(0, MAX_NOTIFICATIONS);
        }
        StorageModule.setStorageObject(jsonObject);
        updateBadgeCount();
    }

    function markAsRead(id) {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject.notifications) {
            var notification = jsonObject.notifications.find(function(n) { return n.id === id; });
            if (notification) {
                notification.read = true;
                StorageModule.setStorageObject(jsonObject);
                updateBadgeCount();
            }
        }
    }

    function storeUserResponse(id, responseType, responseData) {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject.notifications) {
            var notification = jsonObject.notifications.find(function(n) { return n.id === id; });
            if (notification) {
                notification.userResponse = {
                    type: responseType,
                    data: responseData || null,
                    timestamp: Date.now()
                };
                notification.read = true;
                StorageModule.setStorageObject(jsonObject);
                updateBadgeCount();
            }
        }
    }

    function markAllAsRead() {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject.notifications) {
            jsonObject.notifications.forEach(function(n) { n.read = true; });
            StorageModule.setStorageObject(jsonObject);
            updateBadgeCount();
        }
    }

    function deleteNotification(id) {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject.notifications) {
            jsonObject.notifications = jsonObject.notifications.filter(function(n) { return n.id !== id; });
            StorageModule.setStorageObject(jsonObject);
            updateBadgeCount();
            renderNotificationsLog();
        }
    }

    function clearAllNotifications() {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        jsonObject.notifications = [];
        StorageModule.setStorageObject(jsonObject);
        updateBadgeCount();
        renderNotificationsLog();
    }

    function updateBadgeCount() {
        var unreadCount = getStoredNotifications().filter(function(n) { return !n.read; }).length;
        var $badge = $('.notification-badge');
        if (unreadCount > 0) {
            $badge.text(unreadCount).show();
        } else {
            $badge.hide();
        }
    }

    function animateNotificationBell() {
        var $bell = $('.notifications-tab-toggler').first();
        $bell.addClass('notification-bell-animate');
        setTimeout(function() { $bell.removeClass('notification-bell-animate'); }, 600);
    }

    function generateId() {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function getNotificationTypeLabel(type) {
        var labels = {
            'goal_completed': 'Goal Completed',
            'goal_ended_early': 'Goal Ended Early',
            'goal_ended_away': 'Goal Ended While Away',
            'goal_extend_prompt': 'Goal Extension',
            'wait_completed': 'Wait Completed',
            'wait_ended_away': 'Wait Ended',
            'wait_extend_prompt': 'Wait Extension',
            'wait_ended_early': 'Wait Ended Early',
            'wait_acknowledged': 'Wait Completed',
            'timer_conflict': 'Timer Conflict',
            'forgotten_timer': 'Forgotten Timer',
            'welcome': 'Welcome',
            'affirmation': 'Affirmation',
            'info': 'Info'
        };
        return labels[type] || 'Notification';
    }

    function getNotificationTypeClass(type) {
        var classes = {
            'goal_completed': 'type-success',
            'goal_ended_early': 'type-warning',
            'goal_ended_away': 'type-info',
            'goal_extend_prompt': 'type-info',
            'wait_completed': 'type-success',
            'wait_ended_away': 'type-info',
            'wait_extend_prompt': 'type-info',
            'wait_ended_early': 'type-warning',
            'wait_acknowledged': 'type-success',
            'timer_conflict': 'type-warning',
            'forgotten_timer': 'type-warning',
            'welcome': 'type-info',
            'affirmation': 'type-success',
            'info': 'type-default'
        };
        return classes[type] || 'type-default';
    }

    function formatUserResponse(response) {
        var labels = {
            'goal-ended-on-time': 'Completed wait successfully',
            'goal-ended-early': 'Wait ended early',
            'submit-goal-end-time': 'Submitted end time',
            'submit-wait-end-time': 'Submitted end time',
            'extend-goal': 'Extended wait',
            'end-goal': 'Ended wait',
            'wait-complete-extend': 'Started new wait',
            'wait-complete-done': 'Acknowledged completion',
            'cancel-timer-for-wait': 'Cancelled timer',
            'keep-timer': 'Kept timer running',
            'extend-wait': 'Extended wait',
            'end-wait': 'Ended wait',
            'stop-forgotten-timer': 'Stopped timer'
        };
        var label = labels[response.type] || 'Responded';
        var date = new Date(response.timestamp);
        var timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        return label + ' at ' + timeStr;
    }

    function clearOverlayNotification($notification) {
        $notification.addClass('notification-exit');
        setTimeout(function() { $notification.remove(); }, NOTIFICATION_FADE_DURATION);
    }

    /**
     * Generate HTML for response tools based on type
     * @param {string} responseType - Type identifier for the response tools
     * @param {object} responseData - Additional data needed to generate the HTML
     * @returns {string} HTML string for the response tools
     */
    function generateResponseToolsHtml(responseType, responseData) {
        responseData = responseData || {};

        switch (responseType) {
            case 'wait_ended_away':
                return '<button class="notification-response-tool goal-ended-on-time">Yes</button>' +
                       '<button class="notification-response-tool goal-ended-early">No</button>';

            case 'wait_completed':
                return '<button class="notification-response-tool wait-complete-extend" href="#">' +
                           '<i class="fas fa-plus-circle"></i> Extend Wait' +
                       '</button>' +
                       '<button class="notification-response-tool wait-complete-done" href="#">' +
                           '<i class="fas fa-check-circle"></i> I\'m Done' +
                       '</button>';

            case 'goal_ended_early':
                var minFormatted = responseData.minDate || '-0';
                var maxFormatted = responseData.maxDate || '-0';
                return '<div id="goalEndTimePicker" class="time-picker-container">' +
                    '<select class="time-picker-hour">' +
                    '<option value="0">12</option><option value="1">1</option><option value="2">2</option>' +
                    '<option value="3">3</option><option value="4">4</option><option value="5">5</option>' +
                    '<option value="6">6</option><option value="7">7</option><option value="8">8</option>' +
                    '<option value="9">9</option><option value="10">10</option><option value="11">11</option>' +
                    '</select><select class="time-picker-am-pm"><option value="AM">AM</option><option value="PM">PM</option></select></div>' +
                    '<div id="datepicker-notification" style="display:inline-block;"></div>' +
                    '<script>$("#datepicker-notification").datepicker({minDate:' + minFormatted + ',maxDate:' + maxFormatted + '});' +
                    'var h=new Date().getHours();$("#goalEndTimePicker .time-picker-hour").val(h%12);if(h>=12)$("#goalEndTimePicker .time-picker-am-pm").val("PM");</script><br/>' +
                    '<button class="notification-response-tool submit-new-goal-time">Submit</button>';

            case 'forgotten_timer':
                var timerId = responseData.timerId || '';
                return '<button class="notification-response-tool stop-forgotten-timer" data-timer-id="' + timerId + '">Stop Timer</button>';

            case 'timer_conflict':
                return '<button class="notification-response-tool cancel-timer-for-wait" href="#">' +
                    'Yes, cancel timer</button>' +
                    '<button class="notification-response-tool keep-timer" href="#">' +
                    'No, keep timer</button>';

            case 'wait_extend_prompt':
                return '<button class="notification-response-tool extend-wait" href="#">' +
                    'Yes</button>' +
                    '<button class="notification-response-tool end-wait" href="#">' +
                    'No</button>';

            default:
                return '';
        }
    }

    function createNotification(message, responseTools, options) {
        options = options || {};
        var isPersistent = options.persistent !== false;
        var notificationType = options.type || 'info';
        var notificationId = generateId();

        // Determine if we have response tools - either legacy HTML string or new responseType
        var hasResponseTools = !!(responseTools || options.responseType);

        if (isPersistent && hasDuplicateNotification(message)) {
            return null;
        }

        var responseHint = hasResponseTools
            ? '<p class="notification-response-hint"><i class="fas fa-hand-pointer"></i> Tap to respond on notifications page</p>'
            : '';
        var responseClass = hasResponseTools ? ' has-response-tools' : '';

        var template = '<div class="notification notification-overlay' + responseClass + '" data-id="' + notificationId + '">' +
            '<div class="notification-message">' +
            '<p class="notification-text">' + message + '</p>' +
            '<a class="notification-close" href="#">X</a>' +
            '</div>' + responseHint + '</div>';

        var $notification = $(template);
        $('#notification-overlay').append($notification);

        setTimeout(function() { $notification.addClass('notification-visible'); }, 10);

        if (isPersistent) {
            var notificationObj = {
                id: notificationId,
                message: message,
                timestamp: Date.now(),
                read: false,
                hasResponseTools: hasResponseTools,
                type: notificationType
            };

            // Store responseType and responseData instead of raw HTML
            if (options.responseType) {
                notificationObj.responseType = options.responseType;
                notificationObj.responseData = options.responseData || null;
            } else if (responseTools) {
                // Legacy support: if raw HTML is passed, try to infer responseType from notificationType
                notificationObj.responseType = notificationType;
                notificationObj.responseData = options.responseData || null;
            }

            saveNotification(notificationObj);
        }

        setTimeout(function() {
            clearOverlayNotification($notification);
            animateNotificationBell();
        }, NOTIFICATION_STAY_DURATION);

        return notificationId;
    }

    function createWaitEndNotification(waitHandle) {
        var waitTypeGerund = waitHandle.waitType === "use" ? "doing" :
                            waitHandle.waitType === "bought" ? "buying" : "buying and doing";

        var message = 'Your most recent wait ended since your last visit. Did you make it without ' + waitTypeGerund + ' it?';

        createNotification(message, null, {
            type: 'wait_ended_away',
            responseType: 'wait_ended_away'
        });
    }

    // Backward compatibility alias for any code still using old name
    var createGoalEndNotification = createWaitEndNotification;

    function renderNotificationsLog() {
        var notifications = getStoredNotifications();
        var $log = $('#notifications-log');
        
        if (notifications.length === 0) {
            $log.html('<p class="empty-state text-center" style="color: #999; padding: 30px 0;">No notifications yet</p>');
            return;
        }
        
        var html = '';
        notifications.forEach(function(notif) {
            var readClass = notif.read ? 'notification-read' : 'notification-unread';
            var typeClass = getNotificationTypeClass(notif.type);
            var typeLabel = getNotificationTypeLabel(notif.type);
            var date = new Date(notif.timestamp);
            var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            html += '<div class="notification-log-item ' + readClass + ' ' + typeClass + '" data-id="' + notif.id + '">' +
                '<div class="notification-log-content">' +
                '<span class="notification-log-type">' + typeLabel + '</span>' +
                '<p class="notification-log-message">' + notif.message + '</p>' +
                '<span class="notification-log-date">' + dateStr + '</span>';
            
            if (notif.hasResponseTools && !notif.read) {
                var responseHtml = '';
                if (notif.responseType) {
                    responseHtml = generateResponseToolsHtml(notif.responseType, notif.responseData);
                } else if (notif.responseToolsHtml) {
                    // Legacy support for old notifications with stored HTML
                    responseHtml = notif.responseToolsHtml;
                }
                if (responseHtml) {
                    html += '<div class="notification-log-response-tools">' + responseHtml + '</div>';
                }
            }
            
            if (notif.userResponse) {
                html += '<div class="notification-user-response"><i class="fas fa-check-circle"></i>' + 
                    formatUserResponse(notif.userResponse) + '</div>';
            }
            
            html += '</div><div class="notification-log-actions">' +
                (!notif.read ? '<button class="btn btn-sm btn-outline-primary mark-read-btn" title="Mark as read"><i class="fas fa-check"></i></button>' : '') +
                '<button class="btn btn-sm btn-outline-danger delete-notification-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>' +
                '</div></div>';
        });
        
        $log.html(html);
    }

    function setupNotificationEventHandlers(json) {
        // Click on notification body navigates to notifications tab
        $('#notification-overlay').on('click', '.notification-overlay', function (event) {
            if (!$(event.target).hasClass('notification-close')) {
                clearOverlayNotification($(this));
                $('.notifications-tab-toggler').first().click();
            }
        });

        // Close overlay notification on X click
        $('#notification-overlay').on('click', '.notification-close', function (event) {
            event.preventDefault();
            event.stopPropagation();
            clearOverlayNotification($(this).closest('.notification'));
        });

        // Notifications log handlers
        $('#notifications-log').on('click', '.notification-response-tool', function (event) {
            handleNotificationResponse.call(this, event, json);
        });

        $('#notifications-log').on('click', '.extend-goal', function () {
            var id = $(this).closest('.notification-log-item').data('id');
            storeUserResponse(id, 'extend-goal', null);
            renderNotificationsLog();
            WaitModule.extendActiveWait(json);
        });

        $('#notifications-log').on('click', '.end-goal', function () {
            var id = $(this).closest('.notification-log-item').data('id');
            storeUserResponse(id, 'end-goal', null);
            renderNotificationsLog();
            WaitModule.endActiveWait(json);
        });

        $('#notifications-log').on('click', '.mark-read-btn', function() {
            markAsRead($(this).closest('.notification-log-item').data('id'));
            renderNotificationsLog();
        });

        $('#notifications-log').on('click', '.delete-notification-btn', function() {
            deleteNotification($(this).closest('.notification-log-item').data('id'));
        });

        $('#markAllReadBtn').on('click', function() {
            markAllAsRead();
            renderNotificationsLog();
        });

        $('#clearAllNotificationsBtn').on('click', function() {
            if (confirm('Are you sure you want to clear all notifications?')) {
                clearAllNotifications();
            }
        });
    }

    function handleNotificationResponse(event, json) {
        var $this = $(this);
        var $logItem = $this.closest('.notification-log-item');
        var id = $logItem.data('id');
        
        var jsonObject = StorageModule.retrieveStorageObject();
        var activeWaits = jsonObject.action.filter(function (e) {
            return e && e.clickType == "wait" && e.status == 1;
        });
        var mostRecentWait = activeWaits[activeWaits.length - 1];

        if (!mostRecentWait) {
            if (id) markAsRead(id);
            renderNotificationsLog();
            return;
        }

        var startStamp = mostRecentWait.timestamp;
        var endStamp = mostRecentWait.waitStamp;
        var waitType = mostRecentWait.waitType;

        if ($this.hasClass("goal-ended-on-time")) {
            if (id) storeUserResponse(id, 'goal-ended-on-time', { waitType: waitType });
            renderNotificationsLog();

            ActionLogModule.placeWaitIntoLog(startStamp, endStamp, waitType, false, json, StatsCalculationsModule.convertSecondsToDateFormat);
            var affirmation = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];
            createNotification("Congrats on completing your wait! " + affirmation, null, { type: 'wait_completed' });
            StorageModule.changeWaitStatus(3, waitType);

            json.statistics.wait.activeWaitBoth = 0;
            json.statistics.wait.activeWaitUse = 0;
            json.statistics.wait.activeWaitBought = 0;
        }
        else if ($this.hasClass("goal-ended-early")) {
            if (id) storeUserResponse(id, 'goal-ended-early', { waitType: waitType });
            renderNotificationsLog();

            var now = Math.round(new Date() / 1000);
            var minFormatted = Math.floor((now - new Date(parseInt(startStamp)).getTime()) / 86400);
            var maxFormatted = Math.floor((now - new Date(parseInt(endStamp)).getTime()) / 86400);
            minFormatted = minFormatted === 0 ? "-0" : -minFormatted;
            maxFormatted = maxFormatted === 0 ? "-0" : -maxFormatted;

            createNotification("Bummer. When do you think you broke your goal?", null, {
                type: 'goal_ended_early',
                responseType: 'goal_ended_early',
                responseData: { minDate: minFormatted, maxDate: maxFormatted }
            });
        }
        else if ($this.hasClass("submit-new-goal-time")) {
            var selectedDate = $('#datepicker-notification').datepicker('getDate');
            var selectedHours = parseInt($('#goalEndTimePicker .time-picker-hour').val());
            if ($('#goalEndTimePicker .time-picker-am-pm').val() === "PM" && selectedHours !== 12) selectedHours += 12;
            if ($('#goalEndTimePicker .time-picker-am-pm').val() === "AM" && selectedHours === 12) selectedHours = 0;
            
            selectedDate.setHours(selectedHours, 0, 0);
            var tempEndStamp = Math.round(selectedDate.getTime() / 1000);

            if (tempEndStamp - startStamp > 0 || endStamp - tempEndStamp < 0) {
                if (id) storeUserResponse(id, 'submit-wait-end-time', {
                    waitType: waitType,
                    endTimestamp: tempEndStamp
                });
                StorageModule.changeWaitStatus(2, waitType, tempEndStamp);
                ActionLogModule.placeWaitIntoLog(startStamp, tempEndStamp, waitType, false, json, StatsCalculationsModule.convertSecondsToDateFormat);
                renderNotificationsLog();
                json.statistics.wait.activeWaitBoth = 0;
                json.statistics.wait.activeWaitUse = 0;
                json.statistics.wait.activeWaitBought = 0;
            } else {
                alert('Please choose a time within your goal range!');
            }
        }
        // Handle wait completion extension request
        else if ($this.hasClass("wait-complete-extend")) {
            if (id) storeUserResponse(id, 'wait-complete-extend', {});
            renderNotificationsLog();
            
            // Open the wait dialog to create a new wait
            $('#wait-button').click();
        }
        // Handle wait completion done (just dismiss)
        else if ($this.hasClass("wait-complete-done")) {
            if (id) storeUserResponse(id, 'wait-complete-done', {});
            renderNotificationsLog();
            
            // User is done, just dismiss the notification
            var affirmation = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];
            createNotification('Awesome job! ' + affirmation, null, { type: 'wait_acknowledged' });
        }
    }

    return {
        createNotification: createNotification,
        createWaitEndNotification: createWaitEndNotification,
        createGoalEndNotification: createGoalEndNotification, // backward compat alias
        renderNotificationsLog: renderNotificationsLog,
        updateBadgeCount: updateBadgeCount,
        markAsRead: markAsRead,
        init: function (json) {
            setupNotificationEventHandlers(json);
            updateBadgeCount();
        }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationsModule;
} else {
    window.NotificationsModule = NotificationsModule;
}
