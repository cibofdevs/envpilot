import React, { Fragment, useState, useRef, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { BellIcon, UserCircleIcon, XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { UserIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmationModal from '../Common/ConfirmationModal';
import { notificationsAPI } from '../../services/api';
import { config } from '../../config/config';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  // appName removed - using static text "Multi-Environment Deployment" in navbar
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifError, setNotifError] = useState('');
  const [loading, setLoading] = useState(false);
  const bellRef = useRef(null);
  const notifBoxRef = useRef(null);

  // Fetch notifications from backend on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const [notificationsRes, unreadCountRes] = await Promise.all([
          notificationsAPI.getAll(),
          notificationsAPI.getUnreadCount()
        ]);
        setNotifications(notificationsRes.data);
        setUnreadCount(unreadCountRes.data.unreadCount);
      } catch (err) {
        setNotifError('Failed to fetch notifications');
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const handleBellClick = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleClearNotifications = async () => {
    try {
      setLoading(true);
      await notificationsAPI.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      setNotifError('Failed to clear notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setNotifError('Failed to mark all notifications as read');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId, event) => {
    event.stopPropagation(); // Prevent notification click
    try {
      await notificationsAPI.deleteOne(notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setNotifError('Failed to delete notification');
    }
  };

  const handleNotificationClick = async (notificationId) => {
    try {
      // Mark notification as read
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Close notification dropdown when clicking outside
  useEffect(() => {
    if (!showNotifications) return;
    function handleClickOutside(event) {
      if (
        notifBoxRef.current &&
        !notifBoxRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Calculate unread count from notifications if API fails
  const calculatedUnreadCount = unreadCount > 0 ? unreadCount : notifications.filter(n => !n.read).length;

  // Get user photo from user.profilePhoto if available
  const userPhoto = user?.profilePhoto;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <span className="text-green-600">●</span>;
      case 'error':
        return <span className="text-red-600">●</span>;
      case 'warning':
        return <span className="text-yellow-600">●</span>;
      case 'info':
      default:
        return <span className="text-blue-600">●</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 relative z-10">
      {/* Notif error toast */}
      {notifError && (
        <div className="fixed top-4 right-4 z-[9992] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded shadow">
          {notifError}
          <button className="ml-2 text-red-400 hover:text-red-600 dark:hover:text-red-300" onClick={() => setNotifError('')}>✕</button>
        </div>
      )}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2 lg:ml-0 hidden md:block">
              Multi-Environment Deployment
            </h2>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                className="bg-white dark:bg-gray-700 p-2 rounded-full text-gray-400 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none transition-all duration-200 relative"
                onClick={handleBellClick}
                ref={bellRef}
              >
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                {calculatedUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {calculatedUnreadCount}
                  </span>
                )}
              </button>
              {/* Notification dropdown */}
              <Transition
                show={showNotifications}
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <div ref={notifBoxRef} className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-[9997]">
                  <div className="flex items-center justify-between py-2 px-4 border-b border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Notifications</span>
                    {notifications.length > 0 && (
                      <div className="flex space-x-2">
                        {calculatedUnreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:underline focus:outline-none disabled:opacity-50"
                            disabled={loading}
                          >
                            {loading ? 'Marking...' : 'Mark All Read'}
                          </button>
                        )}
                        <button
                          onClick={handleClearNotifications}
                          className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:underline focus:outline-none disabled:opacity-50"
                          disabled={loading}
                        >
                          {loading ? 'Clearing...' : 'Clear All'}
                        </button>
                      </div>
                    )}
                  </div>
                  {loading ? (
                    <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">Loading notifications...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">No notifications</div>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                      {notifications.map((notif) => (
                        <li 
                          key={notif.id} 
                          className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 relative group cursor-pointer transition-colors duration-200 ${
                            !notif.read ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                          }`}
                          onClick={() => handleNotificationClick(notif.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className="mt-1">
                                {getNotificationIcon(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className={`font-medium text-sm ${
                                    !notif.read 
                                      ? 'text-gray-900 dark:text-gray-100 font-semibold' 
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {notif.title}
                                  </span>
                                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">{notif.time}</span>
                                </div>
                                <div className={`text-sm mt-1 ${
                                  !notif.read 
                                    ? 'text-gray-800 dark:text-gray-200' 
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {notif.description}
                                </div>
                                {!notif.read && (
                                  <div className="mt-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                      New
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleDeleteNotification(notif.id, e)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none"
                              title="Delete notification"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Transition>
            </div>

            {/* Profile dropdown */}
            <Menu as="div" className="relative ml-3 z-[9995]">
              <div>
                <Menu.Button className="flex text-sm rounded-full focus:outline-none">
                  <span className="sr-only">Open user menu</span>
                  <div className="flex items-center space-x-2">
                    {userPhoto && config.getStaticFileUrl(userPhoto) ? (
                      <img
                        src={config.getStaticFileUrl(userPhoto)}
                        alt="Profile"
                        className="h-8 w-8 aspect-square rounded-full object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    )}
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</div>
                    </div>
                  </div>
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 dark:ring-gray-700 focus:outline-none z-[9995]">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate('/settings?tab=profile')}
                        className={classNames(
                          active ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300',
                          'block w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 focus:text-gray-900 dark:focus:text-gray-100'
                        )}
                      >
                        <UserIcon className="inline h-5 w-5 mr-2 align-text-bottom" /> Your Profile
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate('/settings')}
                        className={classNames(
                          active ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300',
                          'block w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 focus:text-gray-900 dark:focus:text-gray-100'
                        )}
                      >
                        <Cog6ToothIcon className="inline h-5 w-5 mr-2 align-text-bottom" /> Settings
                      </button>
                    )}
                  </Menu.Item>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogoutClick}
                        className={classNames(
                          active ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'text-red-600 dark:text-red-400',
                          'block w-full text-left px-4 py-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-150 focus:outline-none focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-700 dark:focus:text-red-300'
                        )}
                      >
                        <ArrowLeftOnRectangleIcon className="inline h-5 w-5 mr-2 align-text-bottom" /> Sign out
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={() => {
          handleLogoutConfirm();
        }}
        title={<span className="flex items-center"><ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2 text-red-500" />Sign Out</span>}
        message="Are you sure you want to sign out? You will need to log in again to access your account."
        confirmText="Yes, Sign Out"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700 focus:ring-red-500"
      />
    </div>
  );
}
