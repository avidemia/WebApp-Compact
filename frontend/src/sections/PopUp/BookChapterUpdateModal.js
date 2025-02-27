import React, { useState, useEffect } from 'react';
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
    }
  }, [open]);

  const formik = useFormik({
    initialValues: userValues,
    validationSchema: userSchema,

    onSubmit: (values) => {
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
        authorChapterServices
          .updateChapterApi(bookdata?._id, postData)
          .then((response) => {
            if (response.code === 200) {
              dispatch(renderAction(true));
              setOpen(false);
              getChapterHeader();
              toast.success(response.message);
              // setFieldValue(`chapter_name`, '');
              setFieldValue(`public_visibility`, false);
              setFieldValue(`allow_part_see`, false);
              setStateData({ data: '' });
              setExpressData({ data: '' });
            } else {
              dispatch(renderAction(false));
              toast.success(response.message);
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    },
  });

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
    // setFieldValue(`chapter_name`, '');
    setFieldValue(`public_visibility`, false);
    setFieldValue(`allow_part_see`, false);
    setFieldValue('regular_authors', '');
    setFieldValue('express_authors', '');
    setStateData({ data: '' });
    setExpressData({ data: '' });
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
