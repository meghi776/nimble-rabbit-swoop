import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Edit, Trash2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from '@/contexts/SessionContext';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast'; // Import toast utilities

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'user' | 'admin';
}

const UserManagementPage = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false); // New state for add user modal
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [newEmail, setNewEmail] = useState(''); // New state for new user email
  const [newPassword, setNewPassword] = useState(''); // New state for new user password
  const [newFirstName, setNewFirstName] = useState(''); // New state for new user first name
  const [newLastName, setNewLastName] = useState(''); // New state for new user last name
  const { user: currentUser, session } = useSession(); // Get the current user and session
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role');

    if (error) {
      console.error("Error fetching profiles:", error);
      showError("Failed to load user profiles.");
      setError(error.message);
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error("Error fetching current user role:", error);
          setIsAdmin(false);
        } else if (data) {
          setIsAdmin(data.role === 'admin');
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [currentUser]);

  const handleEditClick = (profile: Profile) => {
    setCurrentProfile(profile);
    setEditFirstName(profile.first_name || '');
    setEditLastName(profile.last_name || '');
    setEditRole(profile.role);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user's profile? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    const toastId = showLoading("Deleting user profile...");
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting profile:", error);
      showError(`Failed to delete profile: ${error.message}`);
    } else {
      showSuccess("User profile deleted successfully!");
      fetchProfiles(); // Re-fetch profiles to update the list
    }
    dismissToast(toastId);
    setLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!currentProfile) return;

    setLoading(true);
    const toastId = showLoading("Saving profile changes...");
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: editFirstName,
        last_name: editLastName,
        role: editRole,
      })
      .eq('id', currentProfile.id);

    if (error) {
      console.error("Error updating profile:", error);
      showError(`Failed to update profile: ${error.message}`);
    } else {
      showSuccess("Profile updated successfully!");
      setIsEditModalOpen(false);
      fetchProfiles(); // Re-fetch profiles to update the list
    }
    dismissToast(toastId);
    setLoading(false);
  };

  const handleAddUserClick = () => {
    setNewEmail('');
    setNewPassword(''); // Clear password field
    setNewFirstName('');
    setNewLastName('');
    setIsAddUserModalOpen(true);
  };

  const handleSubmitAddUser = async () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      showError("Email and password cannot be empty.");
      return;
    }

    if (!session || !session.access_token) {
      showError("You must be logged in to create users. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const toastId = showLoading("Creating new user...");
    try {
      const requestBody = {
        email: newEmail,
        password: newPassword,
        first_name: newFirstName,
        last_name: newLastName,
      };

      console.log("Attempting to invoke create-user-admin with token (relying on auto-attach):", session.access_token);

      const { data, error: invokeError } = await supabase.functions.invoke('create-user-admin', {
        body: JSON.stringify(requestBody),
        // Removed explicit Authorization header, relying on Supabase client to attach it
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (invokeError) {
        console.error("--- Edge Function Invoke Error Details ---");
        console.error("Full invokeError object:", invokeError);
        console.error("invokeError.message:", invokeError.message);
        console.error("invokeError.context:", invokeError.context);
        console.error("invokeError.context?.data (raw):", invokeError.context?.data);
        console.error("invokeError.context?.status:", invokeError.context?.status);
        console.error("----------------------------------------");

        let errorMessage = "An unexpected error occurred while creating the user."; // Default fallback message

        // Try to extract error from context.data
        if (invokeError.context?.data) {
          try {
            let parsedErrorBody: any;
            if (typeof invokeError.context.data === 'string') {
              parsedErrorBody = JSON.parse(invokeError.context.data);
            } else if (typeof invokeError.context.data === 'object' && invokeError.context.data !== null) {
              parsedErrorBody = invokeError.context.data;
            }

            if (parsedErrorBody && typeof parsedErrorBody === 'object' && 'error' in parsedErrorBody) {
              errorMessage = parsedErrorBody.error;
            } else {
              // If context.data is present but not in expected { error: "message" } format
              errorMessage = `Failed to create user: Unexpected response format. Status: ${invokeError.context?.status || 'N/A'}. Raw: ${JSON.stringify(invokeError.context.data)}`;
            }
          } catch (parseErr) {
            console.error("Failed to parse error response body from Edge Function:", parseErr);
            errorMessage = `Failed to create user: ${invokeError.message}. Raw response: ${invokeError.context.data}`;
          }
        } else if (invokeError.message) {
          // Fallback to invokeError.message if context.data is not available
          errorMessage = invokeError.message;
        }

        setError(errorMessage);
        showError(errorMessage);
      } else if (data && (data as any).error) { // This handles cases where function returns 200 but with an error payload
        console.error("Edge Function returned error in data payload (status 200):", (data as any).error);
        setError(`Failed to create user: ${(data as any).error}`);
        showError(`Failed to create user: ${(data as any).error}`);
      } else {
        showSuccess("User created successfully!");
        setIsAddUserModalOpen(false);
        fetchProfiles(); // Re-fetch profiles to show the new user
      }
    } catch (err) {
      console.error("Network or unexpected error invoking Edge Function:", err);
      showError("An unexpected error occurred while creating the user.");
      setError("An unexpected error occurred while creating the user.");
    } finally {
      dismissToast(toastId);
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">User Management</h1>

      {loading && (
        <p className="text-gray-600 dark:text-gray-300">Loading users...</p>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load users: {error}
          </AlertDescription>
        </Alert>
      )}

      {!loading && !error && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>User List</CardTitle>
            {isAdmin && (
              <Button onClick={handleAddUserClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add User
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {profiles.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Role</TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.id}</TableCell>
                        <TableCell>{profile.first_name || 'N/A'}</TableCell>
                        <TableCell>{profile.last_name || 'N/A'}</TableCell>
                        <TableCell>{profile.role}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditClick(profile)}
                              disabled={profile.id === currentUser?.id} // Prevent editing own profile role here to avoid self-lockout
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(profile.id)}
                              disabled={profile.id === currentUser?.id} // Prevent deleting own profile
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit User Profile Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-first-name" className="text-right">
                First Name
              </Label>
              <Input
                id="edit-first-name"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-last-name" className="text-right">
                Last Name
              </Label>
              <Input
                id="edit-last-name"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Role
              </Label>
              <Select value={editRole} onValueChange={(value: 'user' | 'admin') => setEditRole(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New User Dialog */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-email" className="text-right">
                Email
              </Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">
                Password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-first-name" className="text-right">
                First Name
              </Label>
              <Input
                id="new-first-name"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-last-name" className="text-right">
                Last Name
              </Label>
              <Input
                id="new-last-name"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitAddUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;