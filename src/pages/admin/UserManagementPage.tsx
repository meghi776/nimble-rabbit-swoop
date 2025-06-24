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
import { useToast } from "@/components/ui/use-toast";
import { useSession } from '@/contexts/SessionContext';

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
  const { toast } = useToast();
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
      setError(error.message);
      toast({
        title: "Error",
        description: `Failed to load users: ${error.message}`,
        variant: "destructive",
      });
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
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting profile:", error);
      toast({
        title: "Error",
        description: `Failed to delete profile: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User profile deleted successfully.",
      });
      fetchProfiles(); // Re-fetch profiles to update the list
    }
    setLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!currentProfile) return;

    setLoading(true);
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
      toast({
        title: "Error",
        description: `Failed to update profile: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User profile updated successfully.",
      });
      setIsEditModalOpen(false);
      fetchProfiles(); // Re-fetch profiles to update the list
    }
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
      toast({
        title: "Validation Error",
        description: "Email and password cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (!session) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create users.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-user-admin', {
        body: {
          email: newEmail,
          password: newPassword,
          first_name: newFirstName,
          last_name: newLastName,
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (invokeError) {
        console.error("Error invoking Edge Function:", invokeError);
        console.log("Raw Edge Function response data:", invokeError.context?.data); // Log raw data

        let errorMessage = invokeError.message;

        // Attempt to parse the detailed error message from the Edge Function's response body
        if (invokeError.context && invokeError.context.data) {
          try {
            const errorBody = JSON.parse(invokeError.context.data);
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
          } catch (parseErr) {
            console.error("Failed to parse error response body from Edge Function:", parseErr);
            errorMessage = `Failed to create user: ${invokeError.message}. Could not parse detailed error.`;
          }
        }

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (data && data.error) { // This handles cases where function returns 200 but with an error payload
        console.error("Edge Function returned error in data payload:", data.error);
        toast({
          title: "Error",
          description: `Failed to create user: ${data.error}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "User account created successfully!",
        });
        setIsAddUserModalOpen(false);
        fetchProfiles(); // Re-fetch profiles to show the new user
      }
    } catch (err) {
      console.error("Network or unexpected error invoking Edge Function:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the user.",
        variant: "destructive",
      });
    } finally {
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