'use client';

import React, {useState, useCallback} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useToast} from '@/hooks/use-toast';
import {db, auth} from '@/lib/firebase'; // Import Firebase services
import {getStorage, ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import {collection, addDoc, serverTimestamp} from 'firebase/firestore';
import {useAuth} from '@/components/auth-provider';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

const ContentRepositoryPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [uploading, setUploading] = useState(false);
  const {toast} = useToast();
  const {user} = useAuth(); // Use the auth context to get the current user
    const subjectOptions = ['Math', 'Science', 'History', 'English']; // Subject choices
  const gradeLevelOptions = ['Grade 4', 'Grade 6', 'Grade 8']; // Grade Level choices

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a file to upload.',
      });
      return;
    }

    if (!subject || !gradeLevel) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter subject and grade level.',
      });
      return;
    }

    setUploading(true);
    try {
      if (!user) {
        console.error('User is not logged in.');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to upload files.',
        });
        return;
      }

      const storage = getStorage();
      const storageRef = ref(storage, `content/${user.uid}/${fileName}`);

      // Upload the file to Firebase Storage
      const snapshot = await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Save the file metadata and URL to Firestore
      const contentCollection = collection(db, 'content'); // Use the Firestore instance

      await addDoc(contentCollection, {
        teacherId: user.uid, // Save the teacher's UID
        fileName: fileName,
        subject: subject,
        gradeLevel: gradeLevel,
        downloadURL: downloadURL,
        timestamp: serverTimestamp(), // Add a timestamp for sorting
      });
      toast({
        title: 'Success',
        description: 'File uploaded successfully.',
      });
      // Clear the form
      setFile(null);
      setFileName('');
      setSubject('');
      setGradeLevel('');
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `File upload failed: ${error.message}`,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Content Repository</CardTitle>
          <CardDescription>Upload, organize, and manage learning resources.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="file">Select File</Label>
            <Input id="file" type="file" onChange={handleFileChange} />
            {fileName && <p>Selected file: {fileName}</p>}
          </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="subject">Subject</Label>
                            <Select onValueChange={setSubject} defaultValue={subject}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjectOptions.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="gradeLevel">Grade Level</Label>
                            <Select onValueChange={setGradeLevel} defaultValue={gradeLevel}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Grade Level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {gradeLevelOptions.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentRepositoryPage;
