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
import { generateContentRepositoryMetadata } from "@/ai/flows/content-repository";
import { Textarea } from '@/components/ui/textarea';

const ContentRepositoryPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [uploading, setUploading] = useState(false);
	const [fileContent, setFileContent] = useState('');
  const {toast} = useToast();
  const {user} = useAuth(); // Use the auth context to get the current user
    const subjectOptions = ['Math', 'Science', 'History', 'English']; // Subject choices
  const gradeLevelOptions = ['Grade 4', 'Grade 6', 'Grade 8']; // Grade Level choices

	const [aiMetadata, setAiMetadata] = useState({
    subject: '',
    gradeLevel: '',
    tags: [],
    description: '',
    suggestions: [],
  });


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
			// Read file content for AI analysis
			const reader = new FileReader();
			reader.onload = (event: any) => {
				setFileContent(event.target.result);
			};
			reader.readAsText(selectedFile);
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
			setFileContent('');
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

	const handleGenerateMetadata = async () => {
		if (!file) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Please select a file first.',
			});
			return;
		}

		try {
			const result = await generateContentRepositoryMetadata({
				fileName: fileName,
				fileType: file.type,
				fileContent: fileContent,
			});
			setAiMetadata({
				subject: result.subject,
				gradeLevel: result.gradeLevel,
				tags: result.tags,
				description: result.description,
				suggestions: result.suggestions,
			});
			toast({
				title: 'AI Metadata Generated',
				description: 'AI has generated metadata for the file.',
			});
		} catch (error: any) {
			console.error('Error generating metadata:', error);
			toast({
				variant: 'destructive',
				title: 'Error',
				description: `Failed to generate metadata: ${error.message}`,
			});
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
					<Button type="button" onClick={handleGenerateMetadata} disabled={uploading || !file}>
						Generate AI Metadata
					</Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
					{aiMetadata.description && (
						<div className="mt-4">
							<h3 className="text-lg font-semibold">AI Metadata</h3>
							<p>Subject: {aiMetadata.subject}</p>
							<p>Grade Level: {aiMetadata.gradeLevel}</p>
							<p>Tags: {aiMetadata.tags.join(', ')}</p>
							<p>Description: {aiMetadata.description}</p>
							<p>Suggestions: {aiMetadata.suggestions.join(', ')}</p>
						</div>
					)}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentRepositoryPage;
