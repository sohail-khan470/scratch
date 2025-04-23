import React, { useEffect } from "react";
import {
  Box,
  Grid,
  Heading,
  Text,
  Container,
  Flex,
  Icon,
  Spacer,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  SimpleGrid,
} from "@chakra-ui/react";
import { FaImage, FaList, FaThLarge, FaStar } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchCountWallpaper } from "../redux/dashboard/dashboardActions";
import { formatFileSize } from "../utils";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { counts, loading } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchCountWallpaper());
  }, [dispatch]);

  // Add some debugging
  useEffect(() => {
    if (counts) {
      console.log(
        "Static Wallpaper Percentages:",
        counts.staticWallpaperPercentage
      );
      console.log(
        "Live Wallpaper Percentages:",
        counts.liveWallpaperPercentage
      );
    }
  }, [counts]);

  const stats = [
    {
      title: "Static Wallpaper Count",
      count: counts?.staticWallpaperCount || 0,
      icon: FaImage,
    },
    {
      title: "Static Category Count",
      count: counts?.staticCategoryCount || 0,
      icon: FaList,
    },
    {
      title: "Live Wallpaper Count",
      count: counts?.liveWallpaperCount || 0,
      icon: FaThLarge,
    },
    {
      title: "Live Category Count",
      count: counts?.liveCategoryCount || 0,
      icon: FaList,
    },
    {
      title: "Elite Category Count",
      count: counts?.eliteCategoryCount || 0,
      icon: FaStar,
    },
    {
      title: "Elite Wallpaper Count",
      count: counts?.eliteWallpaperCount || 0,
      icon: FaStar,
    },
  ];

  // Make sure we have valid data for the charts
  const safeStaticData = () => {
    if (!counts?.staticWallpaperPercentage) return [];

    // Ensure we have numbers, not strings or null values
    return [
      {
        name: "Free",
        value: Number(counts.staticWallpaperPercentage.freePercentage || 0),
      },
      {
        name: "Paid",
        value: Number(counts.staticWallpaperPercentage.paidPercentage || 0),
      },
      {
        name: "Ads",
        value: Number(counts.staticWallpaperPercentage.adsPercentage || 0),
      },
    ].filter((item) => item.value > 0); // Only include items with values
  };

  const safeLiveData = () => {
    if (!counts?.liveWallpaperPercentage) return [];

    return [
      {
        name: "Free",
        value: Number(counts.liveWallpaperPercentage.freePercentage || 0),
      },
      {
        name: "Paid",
        value: Number(counts.liveWallpaperPercentage.paidPercentage || 0),
      },
    ].filter((item) => item.value > 0);
  };

  const staticWallpaperData = safeStaticData();
  const liveWallpaperData = safeLiveData();

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  const cardBg = useColorModeValue("white", "gray.800");
  const cardShadow = useColorModeValue("lg", "dark-lg");
  const cardTextColor = useColorModeValue("gray.700", "white");
  const cardCountColor = useColorModeValue("indigo.600", "indigo.300");
  const iconBgGradient = useColorModeValue(
    "linear(to-r, teal.400, blue.500)",
    "linear(to-r, purple.500, pink.600)"
  );

  const countFontFamily = "Poppins, sans-serif";
  const countFontSize = { base: "3xl", md: "4xl" };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Spinner
          size="xl"
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="blue.500"
        />
      </Box>
    );
  }

  // Function to render a placeholder message when no data is available
  const renderNoDataMessage = () => (
    <Flex
      height="100%"
      width="100%"
      justifyContent="center"
      alignItems="center"
      minHeight="200px"
    >
      <Text color="gray.500">No data available</Text>
    </Flex>
  );

  return (
    <Container
      maxW="container.xl"
      height="calc(100vh - 50px)"
      py={2}
      overflowY="auto"
    >
      {/* Stats Cards */}
      <Heading as="h3" size="lg" mb={2} color={cardTextColor}>
        Dashboard
      </Heading>
      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
        }}
        gap={6}
      >
        {stats.map((stat, index) => (
          <Box
            key={index}
            bg={cardBg}
            boxShadow={cardShadow}
            borderRadius="lg"
            p={6}
            transition="transform 0.3s ease, box-shadow 0.3s ease"
            _hover={{ transform: "translateY(-10px)", boxShadow: "2xl" }}
          >
            <Flex direction="column" height="100%">
              <Flex align="center">
                <Heading as="h2" size="md" color={cardTextColor}>
                  {stat.title}
                </Heading>
                <Box
                  ml="auto"
                  bgGradient={iconBgGradient}
                  borderRadius="full"
                  pl={2}
                  pr={2}
                  pt={2}
                  pb={0.5}
                >
                  <Icon as={stat.icon} w={5} h={5} color="white" />
                </Box>
              </Flex>
              <Spacer />
              <Text
                fontSize={countFontSize}
                fontWeight="extrabold"
                color={cardCountColor}
                fontFamily={countFontFamily}
                textAlign="left"
                mt={4}
              >
                {stat.count}
              </Text>
            </Flex>
          </Box>
        ))}
      </Grid>

      {/* Percentage Charts Section */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mt={10}>
        {/* Static Wallpaper Percentage Chart */}
        <Box bg={cardBg} boxShadow={cardShadow} borderRadius="lg" p={6}>
          <Heading as="h4" size="md" mb={4} color={cardTextColor}>
            Static Wallpaper Distribution
          </Heading>
          {staticWallpaperData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={staticWallpaperData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {staticWallpaperData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}%`, "Percentage"]}
                  isAnimationActive={false}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            renderNoDataMessage()
          )}
        </Box>

        {/* Live Wallpaper Percentage Chart - Updated to Pie Chart */}
        <Box bg={cardBg} boxShadow={cardShadow} borderRadius="lg" p={6}>
          <Heading as="h4" size="md" mb={4} color={cardTextColor}>
            Live Wallpaper Distribution
          </Heading>
          {liveWallpaperData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={liveWallpaperData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {liveWallpaperData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}%`, "Percentage"]}
                  isAnimationActive={false}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            renderNoDataMessage()
          )}
        </Box>
      </SimpleGrid>

      {/* Rest of your existing tables and content */}
      <Box mt={10} bg={cardBg} boxShadow={cardShadow} borderRadius="lg" p={6}>
        <Heading as="h4" size="md" mb={2} color={cardTextColor}>
          Latest Static Wallpapers
        </Heading>
        {counts?.latestStaticWallpaer?.length > 0 ? (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Category Name</Th>
                <Th>Image Name</Th>
                <Th>Size</Th>
                <Th>Dimension</Th>
                <Th>Date Uploaded</Th>
              </Tr>
            </Thead>
            <Tbody>
              {counts.latestStaticWallpaer.map((wallpaper) => (
                <Tr key={wallpaper.id}>
                  <Td>{wallpaper.id}</Td>
                  <Td>{wallpaper.catName}</Td>
                  <Td>{wallpaper.imageName}</Td>
                  <Td>{formatFileSize(wallpaper.size)}</Td>
                  <Td>{wallpaper.dimension}</Td>
                  <Td>{new Date(wallpaper.createdAt).toLocaleDateString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <Text color="gray.500" textAlign="center" py={4}>
            No wallpapers available
          </Text>
        )}
      </Box>

      {/* ... rest of your existing tables ... */}
    </Container>
  );
};

export default DashboardPage;



/////////////////////////////
 {/* Percentage Charts Section */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mt={10}>
        {/* Static Wallpaper Percentage Chart */}
        <Box bg={cardBg} boxShadow={cardShadow} borderRadius="lg" p={6}>
          <Heading as="h4" size="md" mb={4} color={cardTextColor}>
            Static Wallpaper Distribution
          </Heading>
          {staticWallpaperData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={staticWallpaperData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {staticWallpaperData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}%`, "Percentage"]}
                  isAnimationActive={false}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            renderNoDataMessage()
          )}
        </Box>

        {/* Live Wallpaper Percentage Chart */}
        <Box bg={cardBg} boxShadow={cardShadow} borderRadius="lg" p={6}>
          <Heading as="h4" size="md" mb={4} color={cardTextColor}>
            Live Wallpaper Distribution
          </Heading>
          {liveWallpaperData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={liveWallpaperData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Percentage"]}
                  isAnimationActive={false}
                />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" name="Percentage">
                  {liveWallpaperData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            renderNoDataMessage()
          )}
        </Box>
      </SimpleGrid>





      