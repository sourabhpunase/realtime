import React, { useState } from 'react';
import { UserPlus, Mail, Send, X } from 'lucide-react';

const InvitationManager = ({ project, users = [] }) => {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sentInvitations, setSentInvitations] = useState([]);

  const handleSendInvitation = (e) => {
    e.preventDefault();
    const invitation = {
      id: Date.now(),
      email: inviteEmail,
      message: inviteMessage,
      projectId: project.id,
      projectName: project.name,
      sentAt: new Date(),
      status: 'pending'
    };
    
    setSentInvitations([...sentInvitations, invitation]);
    setInviteEmail('');
    setInviteMessage('');
    setShowInviteForm(false);
    
    // Show success message (in real app, this would be handled by parent component)
    alert(`Invitation sent to ${invitation.email}!`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowInviteForm(true)}
        className="btn btn-primary text-sm flex items-center space-x-1"
        title="Invite Members"
      >
        <UserPlus className="w-4 h-4" />
        <span>Invite</span>
      </button>

      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <Mail className="w-6 h-6 mr-2 text-indigo-500" />
                Invite to {project.name}
              </h3>
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field"
                  placeholder="colleague@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="input-field h-24 resize-none"
                  placeholder="Hi! I'd like to invite you to collaborate on this project..."
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-900 mb-2">Invitation Preview:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Project:</strong> {project.name}</p>
                  <p><strong>Description:</strong> {project.description}</p>
                  <p><strong>Invited by:</strong> You</p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="btn btn-success flex items-center space-x-2 flex-1"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Invitation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>

            {sentInvitations.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Recent Invitations</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {sentInvitations.slice(-3).map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{invitation.email}</span>
                      <span className="text-orange-600 font-medium">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationManager;