"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookingModal } from "@/components/booking-modal"
import { ReviewsList } from "@/components/reviews-list"
import { SkillSwapModal } from "@/components/skill-swap-modal"
import { PaymentModal } from "@/components/payment-modal"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/components/ui/use-toast"
import { MapPin, Calendar, Clock, Star, MessageCircle, RefreshCw, Award } from "lucide-react"

export default function ProviderPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const [provider, setProvider] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isSkillSwapModalOpen, setIsSkillSwapModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is authenticated
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)

        if (session) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*, skills(*)")
            .eq("id", session.user.id)
            .single()

          if (!userError) {
            setCurrentUser(userData)
          }
        }

        // Fetch provider data
        const { data, error } = await supabase
          .from("users")
          .select(`
            *,
            skills (id, skill_name, category, description, intent),
            availability_slots (id, date, start_time, end_time, is_available)
          `)
          .eq("id", params.id)
          .single()

        if (error) throw error

        // Fetch reviews
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select(`
            *,
            reviewer:reviewer_id (name, profile_image)
          `)
          .eq("provider_id", params.id)

        if (reviewsError) throw reviewsError

        // Add reviews to provider data
        setProvider({
          ...data,
          reviews: reviewsData || [],
          rating: reviewsData?.length
            ? reviewsData.reduce((acc: number, review: any) => acc + review.rating, 0) / reviewsData.length
            : 0,
          skill_swap: true, // For demo purposes, assume all providers are open to skill swap
        })
      } catch (error) {
        console.error("Error fetching provider:", error)
        toast({
          title: "Error",
          description: "Failed to load provider details.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  const handleBookingSuccess = async (bookingData: any) => {
    console.log("Booking created successfully:", bookingData)
    setIsBookingModalOpen(false)

    // Create notification
    const notificationData = bookingData.is_skill_swap 
      ? {
          title: "New Skill Swap Request",
          message: `${currentUser?.name} has requested a skill swap session for ${bookingData.service_name}`,
          type: "skill_swap_request"
        }
      : {
          title: "New Booking Request",
          message: `${currentUser?.name} has requested to book a session for ${bookingData.service_name}`,
          type: "new_booking"
        }

    try {
      // Send notification
      await supabase.from('notifications').insert([{
        user_id: provider.id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: { 
          booking_id: bookingData.id,
          is_skill_swap: bookingData.is_skill_swap
        }
      }])

      toast({
        title: notificationData.title,
        description: "Your request has been sent successfully.",
      })

      // Handle payment flow for non-skill-swap bookings
      if (!bookingData.is_skill_swap) {
        setSelectedBooking(bookingData)
        setIsPaymentModalOpen(true)
      }
    } catch (error) {
      console.error("Error creating notification:", error)
      toast({
        title: "Warning",
        description: "Booking created but notification could not be sent.",
        variant: "destructive",
      })
    }
  }

  const handlePaymentSuccess = () => {
    console.log("Payment completed for booking:", selectedBooking?.id)
    setIsPaymentModalOpen(false)
    
    // Show success toast
    toast({
      title: "Booking confirmed",
      description: "Your booking has been successfully confirmed and added to your dashboard.",
    })
    
    // Optional: Navigate to the dashboard to show the booking
    // setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 dark:border-purple-400"></div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">Provider not found</h2>
            <Button onClick={() => router.push("/explore")} className="dark:bg-purple-600 dark:hover:bg-purple-700">Back to Explore</Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-950/30 dark:to-blue-950/30 py-12">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="md:flex">
                <div className="md:w-1/3 p-8 flex flex-col items-center justify-center border-r border-gray-200 dark:border-gray-700">
                  <div className="relative w-40 h-40 rounded-full overflow-hidden mb-4">
                    <Image
                      src={provider.profile_image || "/placeholder.svg?height=160&width=160"}
                      alt={provider.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h1 className="text-2xl font-bold text-center mb-2 dark:text-white">{provider.name}</h1>
                  <div className="flex items-center mb-4">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= Math.round(provider.rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-300 dark:text-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({provider.reviews?.length || 0} reviews)</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{provider.location || "Location not specified"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-6 justify-center">
                    {provider.skills
                      ?.filter((skill: any) => skill.intent === "provider")
                      .map((skill: any) => (
                        <Badge key={skill.id} variant="outline" className="bg-purple-50 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800">
                          {skill.skill_name}
                        </Badge>
                      ))}
                  </div>
                  <div className="space-y-3 w-full">
                    <Button
                      onClick={() => setIsBookingModalOpen(true)}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      Book Session
                    </Button>
                    {provider.skill_swap && currentUser?.skills?.length > 0 && (
                      <Button
                        onClick={() => setIsSkillSwapModalOpen(true)}
                        variant="outline"
                        className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Propose Skill Swap
                      </Button>
                    )}
                    <Button
                      onClick={() => router.push(`/messages?user=${provider.id}`)}
                      variant="outline"
                      className="w-full"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Message
                    </Button>
                  </div>
                </div>
                <div className="md:w-2/3 p-8">
                  <Tabs defaultValue="about">
                    <TabsList className="mb-6">
                      <TabsTrigger value="about">About</TabsTrigger>
                      <TabsTrigger value="availability">Availability</TabsTrigger>
                      <TabsTrigger value="reviews">Reviews</TabsTrigger>
                    </TabsList>

                    <TabsContent value="about">
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-xl font-semibold mb-3 dark:text-white">About Me</h2>
                          <p className="text-gray-700 dark:text-gray-300">{provider.bio || "This provider hasn't added a bio yet."}</p>
                        </div>

                        <div>
                          <h2 className="text-xl font-semibold mb-3 dark:text-white">Skills Offered</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {provider.skills
                              ?.filter((skill: any) => skill.intent === "provider")
                              .map((skill: any) => (
                                <Card key={skill.id} className="dark:bg-gray-700 dark:border-gray-600">
                                  <CardContent className="p-4">
                                    <div className="flex items-start">
                                      <Award className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400 mt-0.5" />
                                      <div>
                                        <h3 className="font-medium dark:text-white">{skill.skill_name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{skill.category}</p>
                                        {skill.description && <p className="text-sm mt-1 dark:text-gray-300">{skill.description}</p>}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </div>

                        {provider.skills?.some((skill: any) => skill.intent === "seeker") && (
                          <div>
                            <h2 className="text-xl font-semibold mb-3 dark:text-white">Skills Seeking</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {provider.skills
                                ?.filter((skill: any) => skill.intent === "seeker")
                                .map((skill: any) => (
                                  <Card key={skill.id} className="dark:bg-gray-700 dark:border-gray-600">
                                    <CardContent className="p-4">
                                      <div className="flex items-start">
                                        <RefreshCw className="h-5 w-5 mr-2 text-green-600 dark:text-green-400 mt-0.5" />
                                        <div>
                                          <h3 className="font-medium dark:text-white">{skill.skill_name}</h3>
                                          <p className="text-sm text-gray-500 dark:text-gray-400">{skill.category}</p>
                                          {skill.description && <p className="text-sm mt-1 dark:text-gray-300">{skill.description}</p>}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h2 className="text-xl font-semibold mb-3">Badges & Achievements</h2>
                          <div className="flex flex-wrap gap-3">
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800">Top Rated</Badge>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800">Quick Responder</Badge>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800">Verified</Badge>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="availability">
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-xl font-semibold mb-3 dark:text-white">Available Time Slots</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {provider.availability_slots?.filter((slot: any) => slot.is_available).length > 0 ? (
                              provider.availability_slots
                                ?.filter((slot: any) => slot.is_available)
                                .map((slot: any) => (
                                  <Card key={slot.id} className="dark:bg-gray-700 dark:border-gray-600">
                                    <CardContent className="p-4">
                                      <div className="flex items-start">
                                        <Calendar className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400 mt-0.5" />
                                        <div>
                                          <h3 className="font-medium dark:text-white">
                                            {new Date(slot.date).toLocaleDateString("en-US", {
                                              weekday: "long",
                                              month: "short",
                                              day: "numeric",
                                            })}
                                          </h3>
                                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <Clock className="h-4 w-4 mr-1" />
                                            {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))
                            ) : (
                              <p className="text-gray-500 dark:text-gray-400 col-span-2">No available time slots at the moment.</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <h2 className="text-xl font-semibold mb-3 dark:text-white">Booking Information</h2>
                          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                            <li className="flex items-start">
                              <span className="font-medium mr-2 dark:text-white">Session Duration:</span> 60 minutes
                            </li>
                            <li className="flex items-start">
                              <span className="font-medium mr-2 dark:text-white">Cancellation Policy:</span> Free cancellation up to 24
                              hours before the session
                            </li>
                            <li className="flex items-start">
                              <span className="font-medium mr-2 dark:text-white">Location:</span> Online or in-person (within{" "}
                              {provider.distance || 5}km radius)
                            </li>
                          </ul>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="reviews">
                      <ReviewsList reviews={provider.reviews} />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />

      {isBookingModalOpen && (
        <BookingModal
          provider={provider}
          currentUser={currentUser}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {isSkillSwapModalOpen && (
        <SkillSwapModal
          provider={provider}
          currentUser={currentUser}
          isOpen={isSkillSwapModalOpen}
          onClose={() => setIsSkillSwapModalOpen(false)}
        />
      )}

      {isPaymentModalOpen && selectedBooking && (
        <PaymentModal
          booking={selectedBooking}
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
