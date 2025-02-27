import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { Box, Button, IconButton } from '@mui/material';
import { MathJax } from 'better-react-mathjax';
import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { HighlightMenu, MenuButton } from 'react-highlight-menu';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { StudentheaderType, bookType, headerType, renderTypeObj, roleType } from 'src/Helpers/constant';
import { getMainBookNameFromClone } from 'src/Helpers/helperFunction';
import { breadcrumAction } from 'src/Redux/Action/breadcrumAction';
import {
  contentTypeAction,
  customArraySequenceAction,
  regularExpressArraySequenceAction,
} from 'src/Redux/Action/htmlAction';
import { bookCategoryService } from 'src/Services/ApiHandlers/bookCategoryService';
import { userReadHistoryService } from 'src/Services/ApiHandlers/userReadHistory';
import authorChapterServices from 'src/Services/WebApiHandler/authorChapterServices';
import { instructorServices } from 'src/Services/WebApiHandler/instructorServices';
import { studentServices } from 'src/Services/WebApiHandler/studentServices';
import { Storage } from 'src/Storage';
import ChapterSummerizeForm from 'src/components/ChapterSummerize/ChapterSummerizeForm';
import Iconify from 'src/components/Iconify';
import AiPopups from 'src/components/ai/AiPopups';
import { useIsInViewport } from 'src/hooks/useIsInViewport';
import BookChapterModal from 'src/sections/PopUp/BookChapterModal';
import BookChapterUpdateModal from 'src/sections/PopUp/BookChapterUpdateModal';
import DeleteModal from 'src/sections/PopUp/DeleteModal';
import InstructorChapterModal from 'src/sections/PopUp/InstuctorModal/InstructorChapterModal';
import InstructorChapterUpdateModal from 'src/sections/PopUp/InstuctorModal/InstructorChapterUpdateModal';
import AiSummaryIcon from '../../../../assets/webImages/Icon-Summary.svg';
import LibrarySidebar from '../LibraryContainer/LibrarySidebar';
import HelperFunction from './HtmlHelper/HelperFunction';
import { AuthorReaderRender, InstructorRender, StudentRender } from './HtmlHelper/HtmlRender';
import LibraryNavigateBar from './HtmlHelper/LibraryNavigateBar';
import NavbarHtmlContent from './HtmlHelper/NavbarHtmlContent';
import BuySub from 'src/components/BuySub/BuySub';
import hljs from 'highlight.js';

const ChapterView = () => {
  const hasToken = Storage.get('authToken');
  const hasRole = Storage.get('user-role') && JSON.parse(Storage.get('user-role'));
  const isLoggedIn = hasToken && hasRole;
  const param = useLocation();
  const pathState = param.state;

  const urlthis = param.pathname.split('/');
  urlthis.shift();
  let isClone = urlthis.find((element) => {
    if (element.includes('-clone')) {
      return true;
    }
    return false;
  })
    ? true
    : false;
  function getRenderType() {
    for (let i = 1; i < urlthis.length; i++) {
      return renderTypeObj[urlthis[i]];
    }
  }

  const currentMenuType = () => {
    if (pathState && pathState.menuType) {
      return pathState.menuType;
    } else if (isClone) {
      return 'CUSTOM';
    }
    return 'REGULAR';
  };
  const renderType = getRenderType();
  const params = useParams();
  const state = useSelector((state) => state.contentHTML.htmlContent);
  const { id, htmltype, mainid, type } = state;
  const [bookId, setBookId] = useState(undefined);
  const [chapterRegularHtmlList, setChapterRegularHtmlList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [menuType, setMenutype] = useState(currentMenuType());
  const [rolesArray, setRolesArray] = useState([]);
  const [customError, setCustomError] = useState();
  const [arrayList, setArrayList] = useState([]);
  const [showSummerize, setShowSummerize] = useState(false);
  const [showSummerizeForm, setShowSummerizeForm] = useState(false);
  const [summerizeData, setSummerizeData] = useState(undefined);
  const [readError, setReadError] = useState('');
  const [readHistoryStatus, setReadHistoryStatus] = useState(undefined);
  const contentRef = useRef(null);

  const isOnEnd = useIsInViewport(contentRef);
  const [actionState, setActionState] = useState({
    add: false,
    edit: false,
    delete: false,
  });

  // states for chapter
  const [openChapterModal, setOpenChapterModal] = useState(false);
  const [openUpdateChapterModal, setOpenUpdateChapterModal] = useState(false);
  const [chapterElement, setChapterElement] = useState();
  const [mainChapterElement, setMainChapterElement] = useState();
  const [openChapterDeleteModal, setOpenChapterDeleteModal] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const formatError = 'This Chapter is not available in this format';

  useEffect(() => {
    getChapterContentCall();
  }, [menuType, mainid]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (isOnEnd && chapterElement !== undefined && readHistoryStatus === 0) {
        updateReadHistoryStatus(chapterElement.book_id, chapterElement._id, 1);
        setReadHistoryStatus(1);
      }
    }, 2000);
    return () => clearTimeout(id);
  }, [isOnEnd, readHistoryStatus, chapterElement]);

  useEffect(() => {
    const id = setTimeout(() => {
      hljs.highlightAll();
    }, 2000);

    return () => clearTimeout(id);
  }, [chapterElement]);

  const getReadHistoryStatus = async (book_id, content_id) => {
    if (!isLoggedIn) {
      return;
    }
    try {
      const response = await userReadHistoryService.getHistoryByContentId(book_id, content_id);
      if (response.data !== null) {
        setReadHistoryStatus(response.data.status);
      } else {
        updateReadHistoryStatus(book_id, content_id, 0);
        setReadHistoryStatus(0);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const updateReadHistoryStatus = async (book_id, content_id, status) => {
    if (!isLoggedIn) {
      return;
    }
    try {
      await userReadHistoryService.put({
        book_id: book_id,
        content_id: content_id,
        status: status,
        content_type: 'chapters',
      });
    } catch (error) {
      console.log(error);
    }
  };

  const getChapterContentCall = () => {
    setIsLoading(true);
    let bookname = params.id;
    if (isClone && menuType !== 'CUSTOM') {
      const mainBookName = getMainBookNameFromClone(bookname);
      bookname = mainBookName;
    }
    if (isClone) {
      const mainBookName = getMainBookNameFromClone(bookname);
      const realBookname = mainBookName;
      bookCategoryService.getStaticChapterContent(realBookname, params.chapter).then((response) => {
        setMainChapterElement(response.data);
      });
    }
    bookCategoryService.getStaticChapterContent(bookname, params.chapter).then((response) => {
      let bookTypeCheck = response.data?.permissions?.bookType;
      let arrayNew = response.data?.permissions?.rolesData.find((item) => {
        if (bookType.main === bookTypeCheck && item.type === roleType.AUTHOR) {
          return item;
        } else if (bookType.clone === bookTypeCheck && item.type === roleType.INSTRUCTOR) {
          return item;
        } else if (bookType.main === bookTypeCheck && item.type === roleType.READER) {
          return item;
        } else if (bookType.clone === bookTypeCheck && item.type === roleType.READER) {
          return item;
        } else if (bookType.main === bookTypeCheck && item.type === roleType.PUBLIC) {
          return item;
        } else if (bookType.clone === bookTypeCheck && item.type === roleType.PUBLIC) {
          return item;
        }
        return false;
      });
      if (response.code === 200) {
        if (!arrayNew.read) {
          if (response.message === 'private') {
            navigate('/need-sub');
          } else {
            setReadError(response.message);
          }
          //navigate('/need-sub');
        } else {
          getReadHistoryStatus(response.data?.book_id, response.data._id);
        }
        setBookId(response.data?.book_id);
        setIsLoading(false);
        setChapterRegularHtmlList(response.data);
        setChapterElement(response.data);
        commonDispatchCall(response.data);
        setRolesArray(arrayNew);
        sequenceCall(arrayNew);
        setCustomError('');

        if (param.hash) {
          setTimeout(() => {
            const element = document.getElementById(param.hash.replace('#', ''));
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }, 1000);
        }
      } else if (response.code === 403) {
        if (response.data.book_id) {
          setBookId(response.data.book_id);
        }
        setIsLoading(false);
        commonDispatchCall(response.data);
        setChapterRegularHtmlList(response.data);
        setRolesArray(arrayNew);
        if (response.message === 'private') {
          navigate('/need-sub');
        } else {
          setCustomError(response.message);
        }
        sequenceCall(arrayNew);
      } else if (response.code === 404) {
        setIsLoading(false);
        setChapterRegularHtmlList([]);
        setCustomError(formatError);
      }
    });
  };

  const sequenceCall = (arrayNew) => {
    // getStaticPaginationCall();
    switch (arrayNew?.type) {
      case roleType.AUTHOR:
        getStaticPaginationCall();
        // getAuthorPagination();
        break;
      case roleType.INSTRUCTOR:
        getInstructorPagination();
        break;
      case roleType.READER:
        getStudentPagination();
        break;
      case roleType.STUDENT:
        getStudentPagination();
        break;
      case roleType.PUBLIC:
        getStaticPaginationCall();
        break;
      default:
        break;
    }
  };

  const getStaticPaginationCall = () => {
    bookCategoryService
      .getStaticPagination(params.id)
      .then((response) => {
        if (response.status === true) {
          if (response.data.length) {
            //dispatch(regularExpressArraySequenceAction(response.data));
            setArrayList(response.data);
          }
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getInstructorPagination = () => {
    if (menuType === 'CUSTOM') {
      instructorServices
        .getInstructorPaginationApi(params.id)
        .then((response) => {
          if (response.status === true) {
            if (response.data.length) {
              dispatch(customArraySequenceAction(response.data));
              setArrayList(response.data);
            }
          }
        })
        .catch((error) => {
          console.log(error);
        });
    } else {
      let bookname = params.id;
      if (isClone && menuType !== 'CUSTOM') {
        let bookIndex = params.id.lastIndexOf('-');
        bookname = params.id.slice(0, bookIndex);
      }
      instructorServices
        .getInstructorMainPaginationApi(bookname)
        .then((response) => {
          if (response.status === true) {
            if (response.data.length) {
              dispatch(regularExpressArraySequenceAction(response.data));
              setArrayList(response.data);
            }
          }
        })
        .catch((error) => {
          console.log(error);
        });
    }
  };

  const getStudentPagination = () => {
    if (menuType == 'CUSTOM') {
      studentServices
        .getStudentMainPaginationApi(params.id)
        .then((response) => {
          if (response.status === true) {
            if (response.data.length) {
              setArrayList(response.data);
            }
          }
        })
        .catch((error) => {
          console.log(error);
        });
    } else {
      let bookname = params.id;
      if (isClone && menuType !== 'CUSTOM') {
        let bookIndex = params.id.lastIndexOf('-');
        bookname = params.id.slice(0, bookIndex);
      }
      studentServices
        .getStudentPaginationApi(bookname)
        .then((response) => {
          if (response.status === true) {
            if (response.data.length) {
              setArrayList(response.data);
            }
          }
        })
        .catch((error) => {
          console.log(error);
        });
    }
  };

  const handleUpdate = (content) => {
    if (rolesArray?.type === roleType.AUTHOR) {
      HelperFunction.authorUpdateChapter(content, menuType);
    } else if (rolesArray?.type === roleType.INSTRUCTOR) {
      HelperFunction.instructorUpdateChapter(content, id);
    }
  };

  const handleSummerize = (setOpenMenu) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedContents = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.style.display = 'none';
    tempDiv.appendChild(selectedContents);
    const text = tempDiv.innerHTML;

    if (text.length < 100) {
      toast.error('Please select more text to summerize');
      tempDiv.remove();
      return;
    }

    tempDiv.remove();

    setSummerizeData(text);
    setShowSummerizeForm(true);

    tempDiv.remove();
  };

  const nextHandler = () => {
    const myindex = arrayList.findIndex(function (item, i) {
      return item.slug === params.chapter;
    });

    const nextIndex = myindex + 1;

    if (nextIndex >= arrayList.length) {
      toast.error('This is the last chapter');
      return;
    }

    dispatch(
      contentTypeAction({
        renderType: renderType,
        id: id,
        htmltype: menuType,
        mainid: arrayList[myindex + 1]._id,
        type: arrayList[myindex + 1].type ? arrayList[myindex + 1].type : 'chapter',
        routerType: 'HEADER',
        counterNum: myindex,
      })
    );

    if (
      arrayList[myindex + 1].type === headerType.header3 ||
      arrayList[myindex + 1].type === StudentheaderType.header3
    ) {
      // header 3
      navigate(
        `/library/${params.id}/${params.chapter}/${params.header}/${params.headertwo}/${arrayList[myindex + 1].slug}`
      );
    } else if (
      arrayList[myindex + 1].type === headerType.header2 ||
      arrayList[myindex + 1].type === StudentheaderType.header2
    ) {
      // header 2
      navigate(`/library/${params.id}/${params.chapter}/${params.header}/${arrayList[myindex + 1].slug}`);
    } else if (
      arrayList[myindex + 1].type === headerType.header1 ||
      arrayList[myindex + 1].type === StudentheaderType.header1
    ) {
      // header 1
      navigate(`/library/${params.id}/${params.chapter}/${arrayList[myindex + 1].slug}`);
    } else {
      // chapter
      navigate(`/library/${params.id}/${arrayList[myindex + 1].slug}`);
    }
  };

  const prevHandler = () => {
    const myindex = arrayList.findIndex(function (item, i) {
      return item.slug === params.chapter;
    });

    if (myindex > 0) {
      dispatch(
        contentTypeAction({
          renderType: renderType,
          id: id,
          htmltype: htmltype,
          mainid: arrayList[myindex - 1]._id,
          type: arrayList[myindex - 1].type ? arrayList[myindex - 1].type : 'chapter',
          routerType: 'HEADER',
          counterNum: myindex,
        })
      );

      let i = myindex - 1;
      let flag = true;
      // i = myindex - 1;
      let type = arrayList[i].type;
      let paramsArr = [arrayList[i]];
      while (flag) {
        if (type === headerType.header1 || type === StudentheaderType.header1) {
          if (!arrayList[i].type) {
            flag = false;
            paramsArr.push(arrayList[i]);
          }
        } else if (type === headerType.header2 || type === StudentheaderType.header2) {
          if (!arrayList[i].type) {
            flag = false;
            paramsArr.push(arrayList[i]);
          } else if (arrayList[i].type === headerType.header1 || arrayList[i].type === StudentheaderType.header1) {
            paramsArr.push(arrayList[i]);
          }
        } else if (type === headerType.header3 || type === StudentheaderType.header3) {
          if (!arrayList[i].type) {
            flag = false;
            paramsArr.push(arrayList[i]);
          } else if (
            arrayList[i].type === headerType.header2 ||
            arrayList[i].type == headerType.header1 ||
            arrayList[i].type === StudentheaderType.header2 ||
            arrayList[i].type == StudentheaderType.header1
          ) {
            paramsArr.push(arrayList[i]);
          }
        } else {
          if (!arrayList[i].type) {
            flag = false;
            paramsArr = [arrayList[i]];
          } else if (
            arrayList[i].type === headerType.header2 ||
            arrayList[i].type == headerType.header1 ||
            arrayList[i].type === StudentheaderType.header2 ||
            arrayList[i].type == StudentheaderType.header1
          ) {
            paramsArr.push(arrayList[i]);
          }
        }
        i--;
      }
      paramsArr.reverse();
      let navArr = [];
      paramsArr.forEach((item) => {
        navArr.push(item.slug);
      });
      if (navArr.length > 0) {
        navigate(`/library/${params.id}/${navArr.join('/')}`);
      }
    } else {
      navigate(`/library/${params.id}`, { state: { id: id } });
    }
  };

  const deleteHandlerChapter = () => {
    let postData = {
      book_id: chapterElement?.book_id,
    };

    let isAuthor = rolesArray.type === roleType.AUTHOR ? true : false;
    let deleteCall = isAuthor ? authorChapterServices.deleteChapterApi : instructorServices.instructorChapterDelete;

    deleteCall(chapterElement?._id, postData)
      .then((response) => {
        if (response.code === 200) {
          navigate(`/library/${params.id}`);
          setOpenChapterDeleteModal(false);
          toast.success(response.message);
        } else {
          setOpenChapterDeleteModal(false);
          toast.success(response.message);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  function commonDispatchCall(response) {
    dispatch(
      breadcrumAction([
        {
          title: 'Home',
          url: '/',
          is_enable: true,
          is_Home: true,
          id: '',
        },
        {
          title: 'Library',
          url: '/my-library',
          is_enable: true,
          is_Home: false,
          id: '',
        },
        {
          title: `${response?.book_name}`,
          url: `/library/${response?.book_slug}`,
          is_enable: true,
          is_Home: false,
          id: response?.book_id,
        },
        {
          title: `${response?.permissions?.bookType === 'main' ? response?.chapter_name : response?.chapter_name}`,
          url: `/library/${response?.permissions?.slug}/${response?.permissions?.slug}`,
          is_enable: false,
          id: response._id,
        },
      ])
    );
  }

  const renderRoleContent = () => {
    if (!rolesArray) return null;
    const { type, read } = rolesArray;

    if (readError) {
      return <BuySub content={readError} />;
    } else if (customError) {
      if (customError === formatError) {
        return <h4>{formatError}</h4>;
      }
      return <BuySub content={customError} />;
    } else if (type === roleType.AUTHOR || (type === roleType.PUBLIC && read)) {
      return (
        <AuthorReaderRender
          content={chapterRegularHtmlList}
          menuType={menuType}
          renderType={rolesArray}
          editBtn={actionState.edit}
          handleUpdate={handleUpdate}
          getChapterContentCall={getChapterContentCall}
        />
      );
    } else if (type === roleType.INSTRUCTOR && menuType === 'CUSTOM' && isClone) {
      return (
        <InstructorRender
          content={chapterRegularHtmlList}
          menuType={menuType}
          editBtn={actionState.edit}
          handleUpdate={handleUpdate}
          getChapterContentCall={getChapterContentCall}
        />
      );
    } else if (type === roleType.READER) {
      return <StudentRender htmlType={menuType} content={chapterRegularHtmlList} />;
    }
    return null;
  };

  return (
    <React.Fragment>
      <Box sx={{ pt: '4rem' }} />
      <div className="position-relative lessons_lt">
        <div className="Library_sec_view bg-light">
          <LibraryNavigateBar
            chapterName={chapterRegularHtmlList?.chapter_name}
            chapterType={'author'}
            id={bookId}
            chapterId={chapterRegularHtmlList._id}
          />
        </div>

        <NavbarHtmlContent
          setActionState={setActionState}
          actionState={actionState}
          menuType={menuType}
          renderType={rolesArray}
        />

        <div className="rightWrapper">
          <div className="w-75 m-auto">
            <div className="sidebarcontent py-5">
              <LibrarySidebar
                renderType={!isClone ? 'author' : 'author_none'}
                setMenutype={setMenutype}
                menuType={menuType}
                renderExpress={!!chapterElement?.express_content || !!mainChapterElement?.express_content}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end m-auto w-75">
            <div className="my-3">
              {actionState.add && (
                <Button
                  variant="contained"
                  type="button"
                  onClick={() => setOpenChapterModal(true)}
                  startIcon={<Iconify icon={'eva:plus-fill'} className="user-btn" />}
                  className="p-2 me-3"
                >
                  Add
                </Button>
              )}

              {actionState.edit && (
                <Button
                  variant="contained"
                  type="button"
                  onClick={() => setOpenUpdateChapterModal(true)}
                  startIcon={<Iconify icon={'eva:edit-fill'} className="user-btn" />}
                  className="p-2 me-3 bg-info"
                >
                  Edit
                </Button>
              )}
              {actionState.delete && (
                <Button
                  variant="contained"
                  type="button"
                  onClick={() => setOpenChapterDeleteModal(true)}
                  startIcon={<Iconify icon={'eva:trash-fill'} className="user-btn" />}
                  className="p-2 bg-danger"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
          <MathJax hideUntilTypeset={'first'} dynamic className="ck-content">
            <HighlightMenu
              target="#book-content"
              zIndex={2}
              allowedPlacements={['top', 'bottom']}
              menu={({ selectedText = '', setClipboard, setMenuOpen }) => (
                <>
                  <MenuButton
                    title="Summarize"
                    onClick={(e) => {
                      handleSummerize(setMenuOpen);
                      setMenuOpen(false);
                    }}
                  >
                    <img src={AiSummaryIcon} width="25px" height="25px" alt="Summaries" />
                  </MenuButton>
                  <MenuButton title="Close menu" onClick={() => setMenuOpen(false)} icon="x-mark" />
                </>
              )}
            />
            <Box
              id="book-content"
              sx={{
                '& h1': {
                  mt: '3rem',
                  mb: '2rem',
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif',
                  fontSize: {
                    xs: '2rem',
                    md: '3rem',
                  },
                },
                '& h2': {
                  my: '2rem',
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif',
                  fontSize: {
                    xs: '1.5rem',
                    md: '2rem',
                  },
                },
                '& h3': {
                  mt: '2rem',
                  mb: '1rem',

                  fontSize: {
                    xs: '1.2rem',
                    md: '1.5rem',
                  },
                },
                '& h4': {
                  mt: '1rem',
                  mb: '0.5rem',
                  fontStyle: 'italic',
                  fontSize: {
                    xs: '18px',
                    md: '22px',
                  },
                },
                position: 'relative',
              }}
              component="article"
              className="mainlesson"
            >
              {renderRoleContent()}
              <Box sx={{ position: 'fixed', top: '52%', left: { xs: '20px', md: '10px', lg: '50px' }, zIndex: '20' }}>
                <IconButton onClick={() => prevHandler()}>
                  <ArrowBackIosIcon />
                </IconButton>
              </Box>
              <Box sx={{ position: 'fixed', top: '52%', right: { xs: '20px', md: '10px', lg: '50px' }, zIndex: '20' }}>
                <IconButton onClick={() => nextHandler()}>
                  <ArrowBackIosIcon style={{ transform: 'rotate(180deg)' }} />
                </IconButton>
              </Box>
            </Box>
          </MathJax>
          <div ref={contentRef}></div>
          {isLoading && (
            <div className="loading">
              <Spinner animation="border" />
            </div>
          )}

          {rolesArray?.type === roleType.AUTHOR && (
            <>
              <BookChapterModal
                open={openChapterModal}
                setOpen={setOpenChapterModal}
                bookdata={chapterElement}
                getChapterHeader={getChapterContentCall}
                // type={"chapter"}
              />
              <BookChapterUpdateModal
                open={openUpdateChapterModal}
                setOpen={setOpenUpdateChapterModal}
                bookId={chapterElement?.book_id}
                bookdata={chapterElement}
                getChapterHeader={getChapterContentCall}
              />
              <DeleteModal
                setOpen={setOpenChapterDeleteModal}
                open={openChapterDeleteModal}
                deleteHandler={deleteHandlerChapter}
              />
            </>
          )}
          {rolesArray?.type === roleType.INSTRUCTOR && (
            <>
              <InstructorChapterModal
                open={openChapterModal}
                setOpen={setOpenChapterModal}
                bookdata={chapterElement}
                getChapterHeader={getChapterContentCall}
              />
              <InstructorChapterUpdateModal
                open={openUpdateChapterModal}
                setOpen={setOpenUpdateChapterModal}
                bookId={chapterElement?.book_id}
                bookdata={chapterElement}
                getChapterHeader={getChapterContentCall}
              />
              <DeleteModal
                setOpen={setOpenChapterDeleteModal}
                open={openChapterDeleteModal}
                deleteHandler={deleteHandlerChapter}
              />
            </>
          )}
        </div>
      </div>
      <AiPopups
        summeryOpen={showSummerize}
        setSummeryOpen={setShowSummerize}
        book_id={chapterElement?.book_id}
        slug={chapterElement?.slug}
        is_header={false}
        is_clone={isClone}
      />
      <ChapterSummerizeForm
        book_id={chapterElement?.book_id}
        chapter_slug={chapterElement?.slug}
        is_clone={isClone}
        is_header={false}
        is_header_two={false}
        open={showSummerizeForm}
        setOpen={setShowSummerizeForm}
        data={summerizeData}
      />
    </React.Fragment>
  );
};

export default ChapterView;
