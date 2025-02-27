import React, { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import Slide from '@mui/material/Slide';
import { useFormik, Form, FormikProvider } from 'formik';
import * as Yup from 'yup';
import { Container, Grid, TextField, FormGroup, FormControlLabel, Switch } from '@mui/material';
import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { LoadingButton } from '@mui/lab';
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
import { Stack, Button, IconButton } from '@mui/material';

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

export default function BookChapterUpdateModal({ open, setOpen, bookId, bookdata, getChapterHeader }) {
  const [value, setValue] = useState(0);
  const [stateData, setStateData] = useState({ data: '' });
  const [expressData, setExpressData] = useState({ data: '' });
  const [showEditor, setShowEditor] = useState(false);
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
    chapter_name: Yup.string().required('Chapter Name is required'),
    regular_authors: Yup.string(),
    express_authors: Yup.string(),
  });

  useEffect(() => {
    if (open === true) {
      setStateData({
        data: bookdata?.regular_content || bookdata?.chapter_content,
      });
      setExpressData({
        data: bookdata?.express_content || bookdata?.chapter_express_content,
      });
      setFieldValue(`chapter_name`, bookdata?.chapter_name);
      setFieldValue(`regular_authors`, bookdata?.regular_authors || '');
      setFieldValue(`express_authors`, bookdata?.express_authors || '');
      setFieldValue(`public_visibility`, bookdata?.public_visibility);
      setFieldValue(`allow_part_see`, bookdata?.allow_part_see ?? false);
      setShowEditor(true);
      fetchExistingFiles();
    }
  }, [open]);

  const fetchExistingFiles = useCallback(async () => {
    if (!bookdata?.book_slug && !bookdata?.slug) return;
    
    setIsLoading(true);
    try {
      const bookSlug = bookdata?.book_slug || bookdata.slug;
      const chapterSlug = bookdata.slug;
      
      console.log('Fetching existing files for:', { bookSlug, chapterSlug });
      
      const response = await aiService.getContextFiles({ bookSlug, chapterSlug });
      console.log('Existing files response:', response);
      
      if (response.code === 200) {
        setExistingFiles(response.data || []);
      } else {
        console.warn('Non-200 response when fetching files:', response);
        setExistingFiles([]);
      }
    } catch (error) {
      console.error('Error fetching context files:', error);
      toast.error('Failed to fetch existing files');
      setExistingFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [bookdata]);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    
    // Filter files to only allow .txt, .md, and .tex
    const allowedExtensions = ['.txt', '.md', '.tex', '.pdf'];
    const filteredFiles = files.filter(file => {
      const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const isAllowed = allowedExtensions.includes(extension);
      if (!isAllowed) {
        toast.warning(`File "${file.name}" has an unsupported extension. Only .txt, .md, .tex, and .pdf files are allowed.`);
      }
      return isAllowed;
    });
    
    setSelectedFiles(prev => [...prev, ...filteredFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteFile = async (fileId) => {
    try {
      const bookSlug = bookdata?.book_slug || bookdata.slug;
      const chapterSlug = bookdata.slug;
      
      const response = await authorChapterServices.deleteAiContextFile({
        bookSlug,
        chapterSlug,
        fileId
      });
      
      if (response.code === 200) {
        setExistingFiles(prev => prev.filter(file => file._id !== fileId));
        toast.success('File deleted successfully');
      } else {
        toast.error(response.message || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const formik = useFormik({
    initialValues: userValues,
    validationSchema: userSchema,

    onSubmit: async (values) => {
      let postData = {
        book_id: bookId,
        chapter_name: values.chapter_name,
        chapter_content: stateData.data,
        chapter_express_content: expressData.data,
        regular_authors: values.regular_authors,
        express_authors: values.express_authors,
        public_visibility: values.public_visibility,
        allow_part_see: values.allow_part_see,
      };

      if (stateData?.data || expressData?.data) {
        try {
          const response = await authorChapterServices.updateChapterApi(bookdata?._id, postData);
          
          if (response.code === 200) {
            // Upload any new context files if they exist
            if (selectedFiles.length > 0) {
              try {
                const formData = new FormData();
                selectedFiles.forEach(file => {
                  formData.append('files', file);
                });
                
                const bookSlug = bookdata?.book_slug || bookdata.slug;
                const chapterSlug = bookdata.slug;
                
                const uploadResponse = await authorChapterServices.uploadAiContextFile({
                  bookSlug,
                  chapterSlug,
                  data: formData
                });
                
                if (uploadResponse.code === 200) {
                  toast.success(`Successfully uploaded ${selectedFiles.length} file(s)`);
                  setSelectedFiles([]);
                } else {
                  toast.error(uploadResponse.message || 'Failed to upload files');
                }
              } catch (error) {
                console.error('Error uploading files:', error);
                toast.error(`Error uploading files: ${error.message}`);
              }
            }
            
            dispatch(renderAction(true));
            setOpen(false);
            getChapterHeader();
            toast.success(response.message);
            resetForm();
          } else {
            dispatch(renderAction(false));
            toast.error(response.message || 'Update failed');
          }
        } catch (error) {
          console.log(error);
          toast.error('An error occurred while updating');
        }
      }
    },
  });

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

  const { values, errors, touched, handleSubmit, getFieldProps, setFieldValue } = formik;
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
    setShowEditor(false);
  };

  return (
    <Dialog
      disableEnforceFocus
      fullWidth
      maxWidth={'lg'}
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
    >
      <section className="mt-5">
        <Container>
          <FormikProvider value={formik}>
            <Form autoComplete="off" noValidate onSubmit={handleSubmit}>
              <div className="row justify-content-between">
                <div className="col-md-9">
                  <TextField
                    fullWidth
                    autoComplete="username"
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
                        label="Partial Visibility"
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
                  {showEditor && <MyEditor onEditorChange={onEditorChangeR} content={stateData.data} />}
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
                  {showEditor && <MyEditor onEditorChange={onEditorChangeE} content={expressData.data} />}
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
                      Upload files (.txt, .md, .tex, .pdf) to provide additional context for AI to answer questions about this chapter.
                      These files won't be visible to users but will be used to enhance AI responses.
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="ai-context-files-input"
                        accept=".txt,.md,.tex,.pdf"
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
                            {file.name} ({(file.size / 1024).toFixed(2)} KB)
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
                            {file.name} {file.size && `(${(file.size / 1024).toFixed(2)} KB)`}
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
}

BookChapterUpdateModal.propTypes = {
  open: PropTypes.bool.isRequired,
  setOpen: PropTypes.func.isRequired,
  bookId: PropTypes.string,
  bookdata: PropTypes.object.isRequired,
  getChapterHeader: PropTypes.func.isRequired,
};