import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  Typography,
  Slide,
  Container, 
  Grid, 
  TextField, 
  FormGroup, 
  FormControlLabel, 
  Switch, 
  Box, 
  IconButton, 
  Stack, 
  Button,
  Tab,
  Tabs
} from '@mui/material';
import { useFormik, Form, FormikProvider } from 'formik';
import * as Yup from 'yup';
import PropTypes from 'prop-types';
import LoadingButton from '@mui/lab/LoadingButton';
import MyEditor from 'src/components/common/Editor';
import authorChapterServices from 'src/Services/WebApiHandler/authorChapterServices';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { renderAction } from 'src/Redux/Action/renderAction';
import AiAccordion from 'src/components/ai/AiAccordion';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { aiService } from 'src/Services/ApiHandlers/aiService';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const BookChapterModal = ({ open, setOpen, bookdata, getChapterHeader, type }) => {
  const [value, setValue] = useState(0);
  const [stateData, setStateData] = useState({ data: '' });
  const [expressData, setExpressData] = useState({ data: '' });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const userValues = {
    chapter_name: '',
    public_visibility: false,
    allow_part_see: false,
    regular_authors: '',
    express_authors: '',
  };

  const userSchema = Yup.object().shape({
    chapter_name: Yup.string().required('Chapter name is required'),
    regular_authors: Yup.string(),
    express_authors: Yup.string(),
  });

  const onSubmit = async (values) => {
    let postData = {
      book_slug: bookdata?.book_slug || bookdata.slug,
      book_id: bookdata?.book_id || bookdata?._id,
      chapter_name: values.chapter_name,
      chapter_content: stateData.data,
      chapter_express_content: expressData.data,
      regular_authors: values.regular_authors,
      express_authors: values.express_authors,
      public_visibility: values.public_visibility,
      allow_part_see: values.allow_part_see,
    };

    console.log('Creating chapter with data:', postData);

    if (stateData?.data || expressData?.data) {
      try {
        const response = await authorChapterServices.createChapterApi(postData);
        console.log('Chapter creation response:', response);
        
        if (response.code === 201) {
          // Upload context files if any are selected
          if (selectedFiles.length > 0) {
            try {
              const formData = new FormData();
              
              // Log each file being added to FormData
              selectedFiles.forEach((file, index) => {
                console.log(`Processing file ${index}:`, {
                  name: file.name,
                  type: file.type,
                  size: file.size
                });
                
                formData.append(`files`, file);
              });

              // Get the correct slugs from the response
              const uploadParams = {
                bookSlug: response.data.book_slug || bookdata.book_slug || bookdata.slug,
                chapterSlug: response.data.slug, // Use the slug from the response
                data: formData
              };
              
              console.log('Upload parameters:', {
                bookSlug: uploadParams.bookSlug,
                chapterSlug: uploadParams.chapterSlug,
                fileCount: selectedFiles.length,
                responseData: response.data
              });

              const uploadResponse = await authorChapterServices.uploadAiContextFile(uploadParams);
              console.log('File upload response:', uploadResponse);

              if (!uploadResponse) {
                throw new Error('No response received from file upload');
              }

              if (uploadResponse.error) {
                throw new Error(uploadResponse.error);
              }

              if (uploadResponse.code >= 400) {
                throw new Error(uploadResponse.message || 'Server error during file upload');
              }

              toast.success(`Successfully uploaded ${selectedFiles.length} file(s)`);
              
              // Refresh the list of existing files
              await fetchExistingFiles();
            } catch (uploadError) {
              console.error('File upload error details:', {
                error: uploadError,
                message: uploadError.message,
                response: uploadError.response?.data,
                status: uploadError.response?.status
              });
              
              let errorMessage = 'Failed to upload context files';
              if (uploadError.response?.data?.message) {
                errorMessage = uploadError.response.data.message;
              } else if (uploadError.message) {
                errorMessage = uploadError.message;
              }
              
              toast.error(`Error uploading files: ${errorMessage}`);
            }
          }

          dispatch(renderAction(true));
          toast.success(response.message);
          setOpen(false);
          getChapterHeader();
          resetForm();
        } else {
          dispatch(renderAction(false));
          toast.error(response.message || 'Failed to create chapter');
        }
      } catch (error) {
        console.error('Error saving chapter:', error);
        toast.error(error.message || 'An error occurred while saving');
      }
    }
  };

  const formik = useFormik({
    initialValues: userValues,
    validationSchema: userSchema,
    onSubmit,
  });

  const fetchExistingFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await aiService.getContextFiles({
        bookSlug: bookdata?.book_slug || bookdata.slug,
        chapterSlug: bookdata.slug
      });
      if (response.code === 200) {
        setExistingFiles(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching context files:', error);
      toast.error('Failed to fetch existing files');
    } finally {
      setIsLoading(false);
    }
  }, [bookdata?.book_slug, bookdata.slug]);

  useEffect(() => {
    if (open && bookdata?._id) {
      fetchExistingFiles();
    }
  }, [open, bookdata?._id, fetchExistingFiles]);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteFile = async (fileId) => {
    try {
      const response = await authorChapterServices.deleteAiContextFile({
        bookSlug: bookdata.book_slug,
        chapterSlug: bookdata.slug,
        filePath: fileId
      });
      
      if (response.code === 200) {
        setExistingFiles(prev => prev.filter(file => file._id !== fileId));
        toast.success('File deleted successfully');
      } else {
        toast.error('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const resetForm = () => {
    setFieldValue('chapter_name', '');
    setFieldValue('regular_authors', '');
    setFieldValue('express_authors', '');
    setFieldValue('public_visibility', false);
    setFieldValue('allow_part_see', false);
    setStateData({ data: '' });
    setExpressData({ data: '' });
    setSelectedFiles([]);
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const onEditorChangeR = (e) => {
    setStateData({
      data: e.getData(),
    });
  };

  const onEditorChangeE = (e) => {
    setExpressData({
      data: e.getData(),
    });
  };

  const { values, errors, touched, handleSubmit: submitForm, getFieldProps, setFieldValue } = formik;
  const handleClose = () => {
    setOpen(false);
    setFieldValue(`chapter_name`, '');
    setFieldValue(`public_visibility`, false);
    setFieldValue(`allow_part_see`, false);
    setFieldValue('regular_authors', '');
    setFieldValue('express_authors', '');
    setStateData({ data: '' });
    setExpressData({ data: '' });
    setSelectedFiles([]);
  };

  return (
    <Dialog fullWidth maxWidth={'lg'} open={open} onClose={handleClose} TransitionComponent={Transition}>
      <section className="mt-5">
        <Container>
          <FormikProvider value={formik}>
            <Form autoComplete="off" noValidate onSubmit={submitForm}>
              <div className="row justify-content-between">
                <div className="col-md-9">
                  <TextField
                    fullWidth
                    type="text"
                    label="Chapter Name"
                    value={values.chapter_name}
                    {...getFieldProps('chapter_name')}
                    error={Boolean(touched.chapter_name && errors.chapter_name)}
                    helperText={touched.chapter_name && errors.chapter_name}
                  />
                </div>

                <div className="col-md-3">
                  <FormGroup>
                    <FormControlLabel
                      control={<Switch checked={values.public_visibility} {...getFieldProps('public_visibility')} />}
                      label="Public Visibility"
                    />
                    {!values.public_visibility && (
                      <FormControlLabel
                        control={<Switch checked={values.allow_part_see} {...getFieldProps('allow_part_see')} />}
                        label="Preview Mode"
                      />
                    )}
                  </FormGroup>
                </div>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', marginTop: 2 }}>
                  <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
                    <Tab label="Regular" {...a11yProps(0)} />
                    <Tab label="Express" {...a11yProps(1)} />
                  </Tabs>
                </Box>

                <TabPanel value={value} index={0}>
                  <MyEditor onEditorChange={onEditorChangeR} content={stateData.data} />

                  {!stateData?.data && !expressData?.data && (
                    <Typography sx={{ color: 'red', fontSize: '0.75rem' }}>content is required</Typography>
                  )}
                  <TextField
                    fullWidth
                    type="text"
                    label="Authors"
                    value={values.authors}
                    {...getFieldProps('regular_authors')}
                    sx={{ my: '1rem' }}
                    error={Boolean(touched.regular_authors && errors.regular_authors)}
                    helperText={touched.regular_authors && errors.regular_authors}
                  />
                </TabPanel>

                <TabPanel value={value} index={1}>
                  <MyEditor onEditorChange={onEditorChangeE} content={expressData.data} />
                  <TextField
                    fullWidth
                    type="text"
                    label="Authors"
                    value={values.authors}
                    {...getFieldProps('express_authors')}
                    sx={{ my: '1rem' }}
                    error={Boolean(touched.express_authors && errors.express_authors)}
                    helperText={touched.express_authors && errors.express_authors}
                  />
                </TabPanel>

                <AiAccordion data={value === 0 ? stateData.data : expressData.data} />

                <div className="col-md-12 mt-3">
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      AI Context Files
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Upload files that provide additional context for the AI when answering questions about this chapter.
                      These files are only used to enhance AI responses and won't be visible to users.
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="ai-context-files-input"
                        accept=".txt,.md,.tex"
                      />
                      <label htmlFor="ai-context-files-input">
                        <Button
                          variant="contained"
                          component="span"
                          startIcon={<UploadFileIcon />}
                        >
                          Upload Files
                        </Button>
                      </label>
                      {isLoading && <Typography variant="body2">Loading existing files...</Typography>}
                    </Stack>
                  </Box>

                  {selectedFiles.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Selected Files
                      </Typography>
                      {selectedFiles.map((file, index) => (
                        <Stack 
                          key={index} 
                          direction="row" 
                          spacing={1} 
                          alignItems="center" 
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="body2">
                            {file.name}
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={() => removeFile(index)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ))}
                    </Box>
                  )}

                  {/* Existing Files Section */}
                  {existingFiles.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Existing Files
                      </Typography>
                      {existingFiles.map((file) => (
                        <Stack 
                          key={file._id} 
                          direction="row" 
                          spacing={1} 
                          alignItems="center" 
                          sx={{ mb: 1 }}
                        >
                          <Typography 
                            variant="body2" 
                            component="a"
                            href={`${process.env.REACT_APP_API_IMAGEURL}/${file.path}`}
                            target="_blank"
                            sx={{ 
                              color: '#00B0FF',
                              textDecoration: 'none',
                              '&:hover': { color: '#007bb2' }
                            }}
                          >
                            {file.name}
                            <DownloadForOfflineIcon sx={{ ml: 1, fontSize: 20 }} />
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteFile(file._id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ))}
                    </Box>
                  )}
                </div>

                <Grid container spacing={2} sx={{ my: 3 }}>
                  <Grid item xs={6}>
                    <LoadingButton
                      size="large"
                      type="button"
                      variant="contained"
                      color="error"
                      onClick={() => handleClose()}
                    >
                      Close
                    </LoadingButton>
                  </Grid>
                  <Grid item xs={6} className="text-end">
                    <LoadingButton size="large" type="submit" variant="contained">
                      Submit
                    </LoadingButton>
                  </Grid>
                </Grid>
              </div>
            </Form>
          </FormikProvider>
        </Container>
      </section>
    </Dialog>
  );
};

BookChapterModal.propTypes = {
  open: PropTypes.bool.isRequired,
  setOpen: PropTypes.func.isRequired,
  bookdata: PropTypes.object.isRequired,
  getChapterHeader: PropTypes.func.isRequired,
  type: PropTypes.string
};

export default BookChapterModal;